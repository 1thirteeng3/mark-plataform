// Get current user profile
// GET /auth-me
// Headers: Authorization: Bearer {token}
// Response: { id, name, email, role, schoolId }

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

        // Verify token expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return new Response(JSON.stringify({
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token has expired'
                }
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Query user by ID
        const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${payload.userId}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!userResponse.ok) {
            throw new Error('Database query failed');
        }

        const users = await userResponse.json();

        if (!users || users.length === 0) {
            return new Response(JSON.stringify({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const user = users[0];

        return new Response(JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            schoolId: user.school_id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Auth me error:', error);

        const errorResponse = {
            error: {
                code: 'AUTH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
