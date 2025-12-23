/**
 * PUT /platform-vouchers-update
 * Update an existing voucher
 * 
 * Required Role: SUPER_ADMIN
 * Body: { id, name?, description?, marksCost?, providerProductId?, isAvailable? }
 * Response: { id, name, description, marksCost, providerProductId, isAvailable, updatedAt }
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

        const { id, name, description, marksCost, providerProductId, isAvailable } = await req.json();

        if (!id) {
            return errorResponse('Voucher ID is required', req, 400);
        }

        // Build update object
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (marksCost !== undefined) updateData.marks_cost = marksCost;
        if (providerProductId !== undefined) updateData.provider_product_id = providerProductId;
        if (isAvailable !== undefined) updateData.is_available = isAvailable;

        const restUrl = getRestUrl();
        const headers = { ...getAdminHeaders(), 'Prefer': 'return=representation' };

        // Update voucher
        const updateResponse = await fetch(`${restUrl}/voucher_catalog?id=eq.${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateData),
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update voucher');
        }

        const voucher = (await updateResponse.json())[0];

        if (!voucher) {
            return errorResponse('Voucher not found', req, 404);
        }

        return jsonResponse({
            id: voucher.id,
            name: voucher.name,
            description: voucher.description,
            marksCost: voucher.marks_cost,
            providerProductId: voucher.provider_product_id,
            isAvailable: voucher.is_available,
            updatedAt: voucher.updated_at,
        }, req);

    } catch (error) {
        console.error('[platform-vouchers-update] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
