/**
 * GET /students-dashboard
 * Get student dashboard (balance and recent transactions)
 * 
 * Required Role: STUDENT
 * Response: { balance: number, transactions: [...] }
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

        // Get student record
        const studentResponse = await fetch(
            `${restUrl}/students?user_id=eq.${payload.userId}`,
            { headers }
        );

        if (!studentResponse.ok) {
            throw new Error('Failed to fetch student details');
        }

        const students = await studentResponse.json();

        if (!students || students.length === 0) {
            return errorResponse('Student record not found', req, 404);
        }

        const student = students[0];

        // Get recent transactions
        const txnResponse = await fetch(
            `${restUrl}/ledger_transactions?student_id=eq.${student.id}&order=created_at.desc&limit=20`,
            { headers }
        );

        if (!txnResponse.ok) {
            throw new Error('Failed to fetch transactions');
        }

        const transactions = await txnResponse.json();

        // Format transactions
        const formattedTransactions = transactions.map((tx: any) => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            createdAt: tx.created_at,
        }));

        return jsonResponse({
            balance: student.marks_balance,
            transactions: formattedTransactions,
        }, req);

    } catch (error) {
        console.error('[students-dashboard] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
