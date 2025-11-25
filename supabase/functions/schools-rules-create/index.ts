// Create new achievement rule
// POST /schools-rules-create
// Headers: Authorization: Bearer {token}
// Body: { ruleName: string, marksToAward: number }
// Response: { id, ruleName, marksToAward, isActive, createdAt }

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
                    message: 'Only admins can create school rules'
                }
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { ruleName, marksToAward } = await req.json();

        if (!ruleName || !marksToAward) {
            throw new Error('Rule name and marks to award are required');
        }

        if (marksToAward <= 0) {
            throw new Error('Marks to award must be positive');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Insert new rule
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/school_rules`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                school_id: payload.schoolId,
                rule_name: ruleName,
                marks_to_award: marksToAward,
                is_active: true
            })
        });

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Database insert failed: ${errorText}`);
        }

        const insertedRules = await insertResponse.json();
        const rule = insertedRules[0];

        return new Response(JSON.stringify({
            id: rule.id,
            ruleName: rule.rule_name,
            marksToAward: rule.marks_to_award,
            isActive: rule.is_active,
            createdAt: rule.created_at
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create rule error:', error);

        const errorResponse = {
            error: {
                code: 'RULE_CREATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
