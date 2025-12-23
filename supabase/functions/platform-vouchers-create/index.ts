/**
 * POST /platform-vouchers-create
 * Create a new voucher
 * 
 * Required Role: SUPER_ADMIN
 * Body: { name, description, marksCost, providerProductId, isAvailable }
 * Response: { id, name, description, marksCost, providerProductId, isAvailable, createdAt }
 */

import { requireAuth, requireRole } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAdminHeaders, getRestUrl } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        // Authenticate user
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        const { payload } = authResult;

        // Check role (SUPER_ADMIN required)
        const roleError = requireRole(payload, ['SUPER_ADMIN']);
        if (roleError) return roleError;

        const { name, description, marksCost, providerProductId, isAvailable } = await req.json();

        if (!name || !description || !marksCost || !providerProductId) {
            return errorResponse('Missing required fields', req, 400);
        }

        const restUrl = getRestUrl();
        const headers = { ...getAdminHeaders(), 'Prefer': 'return=representation' };

        // Create voucher
        const createResponse = await fetch(`${restUrl}/voucher_catalog`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name,
                description,
                marks_cost: marksCost,
                provider_product_id: providerProductId,
                is_available: isAvailable !== undefined ? isAvailable : true,
            }),
        });

        if (!createResponse.ok) {
            throw new Error('Failed to create voucher');
        }

        const voucher = (await createResponse.json())[0];

        return jsonResponse({
            id: voucher.id,
            name: voucher.name,
            description: voucher.description,
            marksCost: voucher.marks_cost,
            providerProductId: voucher.provider_product_id,
            isAvailable: voucher.is_available,
            createdAt: voucher.created_at,
        }, req);

    } catch (error) {
        console.error('[platform-vouchers-create] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
