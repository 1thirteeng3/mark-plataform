/**
 * GET /platform-stats
 * Get global platform statistics
 * 
 * Required Role: SUPER_ADMIN or ADMIN
 * Response: { totalSchools, totalStudents, totalTransactions, totalMarksInCirculation }
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

        // Check role (SUPER_ADMIN or ADMIN)
        const roleError = requireRole(payload, ['SUPER_ADMIN', 'ADMIN']);
        if (roleError) return roleError;

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Get counts using PostgREST count feature
        const [schoolsRes, studentsRes, transactionsRes, balancesRes] = await Promise.all([
            fetch(`${restUrl}/schools?select=count`, { headers: { ...headers, 'Prefer': 'count=exact' } }),
            fetch(`${restUrl}/students?select=count`, { headers: { ...headers, 'Prefer': 'count=exact' } }),
            fetch(`${restUrl}/ledger_transactions?select=count`, { headers: { ...headers, 'Prefer': 'count=exact' } }),
            fetch(`${restUrl}/students?select=marks_balance`, { headers }),
        ]);

        // Parse counts from content-range header
        const schoolsCount = parseInt(schoolsRes.headers.get('content-range')?.split('/')[1] || '0');
        const studentsCount = parseInt(studentsRes.headers.get('content-range')?.split('/')[1] || '0');
        const transactionsCount = parseInt(transactionsRes.headers.get('content-range')?.split('/')[1] || '0');

        // Calculate total marks in circulation
        const balances = await balancesRes.json();
        const totalMarksInCirculation = Array.isArray(balances)
            ? balances.reduce((sum: number, s: { marks_balance: number }) => sum + (s.marks_balance || 0), 0)
            : 0;

        return jsonResponse({
            totalSchools: schoolsCount,
            totalStudents: studentsCount,
            totalTransactions: transactionsCount,
            totalMarksInCirculation,
        }, req);

    } catch (error) {
        console.error('[platform-stats] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
