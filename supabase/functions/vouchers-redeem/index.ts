/**
 * POST /vouchers-redeem
 * Redeem voucher for marks (Legacy single-step)
 * 
 * Required Role: STUDENT
 * Body: { voucherId: string }
 * Response: { success: true, voucherCode: string, newBalance: number }
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

        // Check role (STUDENT required)
        const roleError = requireRole(payload, ['STUDENT']);
        if (roleError) return roleError;

        const { voucherId } = await req.json();

        if (!voucherId) {
            return errorResponse('Voucher ID is required', req, 400);
        }

        const supabase = getSupabaseAdmin();

        // Get student record
        const { data: students, error: studentErr } = await supabase
            .from('students')
            .select('id, marks_balance')
            .eq('user_id', payload.userId)
            .single();

        if (studentErr || !students) {
            return errorResponse('Student record not found', req, 404);
        }

        const student = students;

        // Get voucher details
        const { data: voucher, error: voucherErr } = await supabase
            .from('voucher_catalog')
            .select('*')
            .eq('id', voucherId)
            .single();

        if (voucherErr || !voucher) {
            return errorResponse('Voucher not found', req, 404);
        }

        if (!voucher.is_available) {
            return errorResponse('This voucher is no longer available', req, 400);
        }

        if (student.marks_balance < voucher.marks_cost) {
            return errorResponse(
                `You need ${voucher.marks_cost} marks but only have ${student.marks_balance}`,
                req, 400
            );
        }

        // STEP 1: Deduct marks
        const newBalance = student.marks_balance - voucher.marks_cost;
        await supabase
            .from('students')
            .update({ marks_balance: newBalance, updated_at: new Date().toISOString() })
            .eq('id', student.id);

        // STEP 2: Create redemption record
        const { data: redemption } = await supabase
            .from('redeemed_vouchers')
            .insert({
                student_id: student.id,
                voucher_catalog_id: voucherId,
                status: 'PENDING',
            })
            .select()
            .single();

        // STEP 3: Create ledger transaction
        await supabase.from('ledger_transactions').insert({
            student_id: student.id,
            type: 'DEBIT',
            amount: voucher.marks_cost,
            description: `Redeemed: ${voucher.name}`,
            source_redemption_id: redemption?.id,
        });

        // STEP 4: Mock external API
        let voucherCode = `MOCK-${voucher.provider_product_id}-${Date.now()}`;
        let redemptionStatus = 'COMPLETED';

        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (Math.random() < 0.1) throw new Error('External API failed');
        } catch {
            // Compensate on failure
            redemptionStatus = 'FAILED';
            await supabase
                .from('students')
                .update({ marks_balance: student.marks_balance })
                .eq('id', student.id);

            await supabase.from('ledger_transactions').insert({
                student_id: student.id,
                type: 'CREDIT',
                amount: voucher.marks_cost,
                description: `Refund: Failed redemption of ${voucher.name}`,
                source_redemption_id: redemption?.id,
            });
        }

        // STEP 5: Update redemption
        await supabase
            .from('redeemed_vouchers')
            .update({ status: redemptionStatus, voucher_code: voucherCode })
            .eq('id', redemption?.id);

        if (redemptionStatus === 'FAILED') {
            return errorResponse('Voucher provider API failed. Your marks have been restored.', req, 500);
        }

        return jsonResponse({
            success: true,
            voucherCode,
            newBalance,
            message: `Successfully redeemed ${voucher.name}!`,
        }, req);

    } catch (error) {
        console.error('[vouchers-redeem] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
