/**
 * GET /platform-transactions?page=1&limit=50
 * Get global transaction ledger with pagination
 * 
 * Required Role: SUPER_ADMIN
 * Response: { transactions: [{ id, date, studentName, schoolName, type, amount, description }], totalCount, page, limit }
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

        // Check role (SUPER_ADMIN only for transactions)
        const roleError = requireRole(payload, ['SUPER_ADMIN']);
        if (roleError) return roleError;

        // Parse pagination params
        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
        const offset = (page - 1) * limit;

        const restUrl = getRestUrl();
        const headers = { ...getAdminHeaders(), 'Prefer': 'count=exact' };

        // Fetch transactions
        const txnResponse = await fetch(
            `${restUrl}/ledger_transactions?select=id,student_id,type,amount,description,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`,
            { headers }
        );

        if (!txnResponse.ok) {
            throw new Error(`Failed to fetch transactions: ${txnResponse.status}`);
        }

        const transactions = await txnResponse.json();
        const totalCount = parseInt(txnResponse.headers.get('content-range')?.split('/')[1] || '0');

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return jsonResponse({ transactions: [], totalCount: 0, page, limit }, req);
        }

        // Get unique student IDs
        const studentIds = [...new Set(transactions.map((t: any) => t.student_id))].filter(Boolean);

        if (studentIds.length === 0) {
            return jsonResponse({ transactions: [], totalCount, page, limit }, req);
        }

        // Fetch students
        const studentsRes = await fetch(
            `${restUrl}/students?id=in.(${studentIds.join(',')})&select=id,user_id,school_id`,
            { headers }
        );
        const students = await studentsRes.json();

        // Get user and school IDs
        const userIds = [...new Set(students.map((s: any) => s.user_id))].filter(Boolean);
        const schoolIds = [...new Set(students.map((s: any) => s.school_id))].filter(Boolean);

        // Fetch related data in parallel
        const [usersRes, schoolsRes] = await Promise.all([
            userIds.length > 0
                ? fetch(`${restUrl}/users?id=in.(${userIds.join(',')})&select=id,name`, { headers })
                : Promise.resolve({ json: async () => [] }),
            schoolIds.length > 0
                ? fetch(`${restUrl}/schools?id=in.(${schoolIds.join(',')})&select=id,name`, { headers })
                : Promise.resolve({ json: async () => [] }),
        ]);

        const users = await usersRes.json();
        const schools = await schoolsRes.json();

        // Create lookup maps
        const userMap = new Map(users.map((u: any) => [u.id, u.name]));
        const schoolMap = new Map(schools.map((s: any) => [s.id, s.name]));
        const studentMap = new Map(students.map((s: any) => [s.id, { userId: s.user_id, schoolId: s.school_id }]));

        // Transform data
        const formattedTransactions = transactions.map((txn: any) => {
            const student = studentMap.get(txn.student_id);
            return {
                id: txn.id,
                date: txn.created_at,
                studentName: student ? userMap.get(student.userId) || 'Unknown' : 'Unknown',
                schoolName: student ? schoolMap.get(student.schoolId) || 'Unknown' : 'Unknown',
                type: txn.type,
                amount: txn.amount,
                description: txn.description,
            };
        });

        return jsonResponse({ transactions: formattedTransactions, totalCount, page, limit }, req);

    } catch (error) {
        console.error('[platform-transactions] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
