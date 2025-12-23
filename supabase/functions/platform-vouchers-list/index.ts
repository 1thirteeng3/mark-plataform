/**
 * GET /platform-vouchers-list
 * List all vouchers for management
 * 
 * Required Role: SUPER_ADMIN
 * Response: [{ id, name, description, marksCost, providerProductId, isAvailable, createdAt }]
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

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Fetch all vouchers
        const vouchersResponse = await fetch(
            `${restUrl}/voucher_catalog?select=*&order=created_at.desc`,
            { headers }
        );

        if (!vouchersResponse.ok) {
            throw new Error('Failed to fetch vouchers');
        }

        const vouchers = await vouchersResponse.json();

        // Transform to camelCase
        const formattedVouchers = vouchers.map((v: any) => ({
            id: v.id,
            name: v.name,
            description: v.description,
            marksCost: v.marks_cost,
            providerProductId: v.provider_product_id,
            isAvailable: v.is_available,
            createdAt: v.created_at,
        }));

        return jsonResponse(formattedVouchers, req);

    } catch (error) {
        console.error('[platform-vouchers-list] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
