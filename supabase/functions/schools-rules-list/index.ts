// List achievement rules for school
// GET /schools-rules-list
// Headers: Authorization: Bearer {token}
// Response: [{ id, ruleName, marksToAward, isActive, createdAt }]

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('x-user-token');
        if (!authHeader) {
            throw new Error('Authorization header is required');
        }

        // Extract and decode JWT token
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        
        if (parts.length < 2) {
            throw new Error('Invalid token format');
        }

        const payload = JSON.parse(atob(parts[1]));

        // Verify role is ADMIN
        if (payload.role !== 'ADMIN') {
            return new Response(JSON.stringify({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only admins can access school rules'
                }
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Query rules for this school
        const rulesResponse = await fetch(
            `${supabaseUrl}/rest/v1/school_rules?school_id=eq.${payload.schoolId}&order=created_at.desc`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!rulesResponse.ok) {
            throw new Error('Database query failed');
        }

        const rules = await rulesResponse.json();

        // Convert to camelCase format
        const formattedRules = rules.map(rule => ({
            id: rule.id,
            ruleName: rule.rule_name,
            marksToAward: rule.marks_to_award,
            isActive: rule.is_active,
            createdAt: rule.created_at
        }));

        return new Response(JSON.stringify(formattedRules), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('List rules error:', error);

        const errorResponse = {
            error: {
                code: 'RULES_LIST_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
