// Authentication login endpoint
// POST /auth-login
// Body: { email: string, password: string }
// Response: { token: string, user: { id, name, email, role, schoolId } }

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Query user by email
        const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
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
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password'
                }
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const user = users[0];

        // In production, verify password hash using bcrypt
        // For demo, we'll skip actual password verification
        // if (user.password_hash !== await hashPassword(password)) { ... }

        // Create JWT token payload
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            schoolId: user.school_id,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };

        // Create JWT token (simple Base64 encoding for demo)
        // In production, use proper JWT signing with crypto
        const tokenData = btoa(JSON.stringify(payload));
        const token = `Bearer.${tokenData}`;

        return new Response(JSON.stringify({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.school_id
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Login error:', error);

        const errorResponse = {
            error: {
                code: 'LOGIN_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
