// PUT /platform-vouchers-update
// Update an existing voucher
// Body: { id, name, description, marksCost, providerProductId, isAvailable }

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
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Validate SUPER_ADMIN token
        validateSuperAdminToken(req);

        const { id, name, description, marksCost, providerProductId, isAvailable } = await req.json();

        if (!id) {
            throw new Error('Voucher ID is required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Build update object with only provided fields
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (marksCost !== undefined) updateData.marks_cost = marksCost;
        if (providerProductId !== undefined) updateData.provider_product_id = providerProductId;
        if (isAvailable !== undefined) updateData.is_available = isAvailable;

        // Update voucher
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/voucher_catalog?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update voucher');
        }

        const voucher = (await updateResponse.json())[0];

        if (!voucher) {
            throw new Error('Voucher not found');
        }

        // Transform to camelCase
        const formattedVoucher = {
            id: voucher.id,
            name: voucher.name,
            description: voucher.description,
            marksCost: voucher.marks_cost,
            providerProductId: voucher.provider_product_id,
            isAvailable: voucher.is_available,
            updatedAt: voucher.updated_at
        };

        return new Response(JSON.stringify(formattedVoucher), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Platform voucher update error:', error);

        const errorResponse = {
            error: {
                code: 'VOUCHER_UPDATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: error.message.includes('permissions') ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
