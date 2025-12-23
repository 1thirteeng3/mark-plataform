/**
 * POST /awards
 * Award marks to a student
 * 
 * Required Role: ADMIN
 * Body: { studentId, ruleId, amount, description }
 * Response: { message, balance, transactionId }
 */

import { requireAuth, requireRole } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        // Authenticate user
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        const { payload } = authResult;

        // Check role (ADMIN required)
        const roleError = requireRole(payload, ['ADMIN', 'SUPER_ADMIN']);
        if (roleError) return roleError;

        // Parse body
        const { studentId, ruleId, amount, description } = await req.json();

        if (!studentId || !ruleId || !amount || !description) {
            return errorResponse('Missing required fields: studentId, ruleId, amount, description', req, 400);
        }

        // Call stored procedure
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('grant_marks', {
            p_student_id: studentId,
            p_rule_id: ruleId,
            p_amount: amount,
            p_description: description,
            p_user_id: payload.userId,
        });

        if (error) {
            console.error('[awards] RPC Error:', error);
            return errorResponse(error.message, req, 400);
        }

        if (!data.success) {
            return errorResponse(data.message, req, 400);
        }

        return jsonResponse({
            message: 'Marks granted successfully',
            balance: data.new_balance,
            transactionId: data.transaction_id,
        }, req);

    } catch (error) {
        console.error('[awards] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
