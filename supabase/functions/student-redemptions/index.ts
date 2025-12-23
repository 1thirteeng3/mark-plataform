/**
 * GET /student-redemptions
 * Get student's voucher redemption history
 * 
 * Required Role: STUDENT
 * Response: [{ id, voucherName, voucherCode, marksCost, redeemedAt, status }]
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

        // Get student ID
        const studentsRes = await fetch(`${restUrl}/students?user_id=eq.${payload.userId}&select=id`, { headers });
        const students = await studentsRes.json();

        if (!students || students.length === 0) {
            return errorResponse('Student record not found', req, 404);
        }

        const studentId = students[0].id;

        // Fetch redemptions with voucher details
        const redemptionsRes = await fetch(
            `${restUrl}/redeemed_vouchers?student_id=eq.${studentId}&select=id,voucher_code,status,created_at,voucher_catalog!inner(name,marks_cost)&order=created_at.desc`,
            { headers }
        );

        if (!redemptionsRes.ok) {
            throw new Error('Failed to fetch redemptions');
        }

        const redemptions = await redemptionsRes.json();

        // Transform to camelCase
        const formattedRedemptions = redemptions.map((r: any) => ({
            id: r.id,
            voucherName: r.voucher_catalog.name,
            voucherCode: r.voucher_code,
            marksCost: r.voucher_catalog.marks_cost,
            redeemedAt: r.created_at,
            status: r.status,
        }));

        return jsonResponse(formattedRedemptions, req);

    } catch (error) {
        console.error('[student-redemptions] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
