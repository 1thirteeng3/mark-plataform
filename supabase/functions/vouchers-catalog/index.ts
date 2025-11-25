// List available vouchers
// GET /vouchers-catalog
// Headers: Authorization: Bearer {token}
// Response: [{ id, name, description, marksCost, isAvailable }]

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

        // Verify role is STUDENT
        if (payload.role !== 'STUDENT') {
            return new Response(JSON.stringify({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only students can access voucher catalog'
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

        // Get available vouchers
        const vouchersResponse = await fetch(
            `${supabaseUrl}/rest/v1/voucher_catalog?is_available=eq.true&order=marks_cost.asc`,
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

        // Convert to camelCase format
        const formattedVouchers = vouchers.map(voucher => ({
            id: voucher.id,
            name: voucher.name,
            description: voucher.description,
            marksCost: voucher.marks_cost,
            providerProductId: voucher.provider_product_id,
            isAvailable: voucher.is_available
        }));

        return new Response(JSON.stringify(formattedVouchers), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Voucher catalog error:', error);

        const errorResponse = {
            error: {
                code: 'CATALOG_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
