/**
 * GET /schools-students-list
 * List students for a school
 * 
 * Required Role: ADMIN
 * Response: { data: [...], meta: { page, limit, total } }
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

        // Parse pagination
        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
        const offset = (page - 1) * limit;

        const supabase = getSupabaseAdmin();

        // Fetch students scoped to school
        const query = supabase
            .from('students')
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('name', { ascending: true });

        // Scope to school if not SUPER_ADMIN
        if (payload.role === 'ADMIN' && payload.schoolId) {
            query.eq('school_id', payload.schoolId);
        }

        const { data: students, count, error } = await query;

        if (error) throw error;

        return jsonResponse({
            data: students,
            meta: { page, limit, total: count },
        }, req);

    } catch (error) {
        console.error('[schools-students-list] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
