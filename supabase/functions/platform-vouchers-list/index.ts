// GET /platform-vouchers
// List all vouchers for management
// Response: [{ id, name, description, marksCost, providerProductId, isAvailable, createdAt }]

function validateSuperAdminToken(req: Request): { userId: string; role: string; schoolId: string | null } {
    const token = req.headers.get('x-user-token');
    if (!token) throw new Error('No authentication token provided');
    const parts = token.split('.');
    if (parts.length !== 2 || parts[0] !== 'Bearer') throw new Error('Invalid token format');
    try {
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) throw new Error('Token expired');
        if (payload.role !== 'SUPER_ADMIN') throw new Error('Insufficient permissions - SUPER_ADMIN access required');
        return { userId: payload.userId, role: payload.role, schoolId: payload.schoolId || null };
    } catch (error) {
        throw new Error('Invalid token');
    }
}


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
        // Validate SUPER_ADMIN token
        validateSuperAdminToken(req);

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Fetch all vouchers (including inactive)
        const vouchersResponse = await fetch(
            `${supabaseUrl}/rest/v1/voucher_catalog?select=*&order=created_at.desc`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!vouchersResponse.ok) {
            throw new Error('Failed to fetch vouchers');
        }

        const vouchers = await vouchersResponse.json();

        // Transform to camelCase
        const formattedVouchers = vouchers.map((voucher: any) => ({
            id: voucher.id,
            name: voucher.name,
            description: voucher.description,
            marksCost: voucher.marks_cost,
            providerProductId: voucher.provider_product_id,
            isAvailable: voucher.is_available,
            createdAt: voucher.created_at
        }));

        return new Response(JSON.stringify(formattedVouchers), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Platform vouchers list error:', error);

        const errorResponse = {
            error: {
                code: 'VOUCHERS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: error.message.includes('permissions') ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
