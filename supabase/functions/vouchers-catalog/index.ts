/**
 * GET /vouchers-catalog
 * List available vouchers for students
 * 
 * Required Role: STUDENT
 * Response: [{ id, name, description, marksCost, isAvailable }]
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

        // Check role (STUDENT required)
        const roleError = requireRole(payload, ['STUDENT']);
        if (roleError) return roleError;

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Get available vouchers
        const vouchersResponse = await fetch(
            `${restUrl}/voucher_catalog?is_available=eq.true&order=marks_cost.asc`,
            { headers }
        );

        if (!vouchersResponse.ok) {
            throw new Error('Failed to fetch vouchers');
        }

        const vouchers = await vouchersResponse.json();

        // Convert to camelCase
        const formattedVouchers = vouchers.map((v: any) => ({
            id: v.id,
            name: v.name,
            description: v.description,
            marksCost: v.marks_cost,
            providerProductId: v.provider_product_id,
            isAvailable: v.is_available,
        }));

        return jsonResponse(formattedVouchers, req);

    } catch (error) {
        console.error('[vouchers-catalog] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
