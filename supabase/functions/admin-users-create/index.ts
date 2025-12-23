/**
 * POST /admin-users-create
 * Super Admin: Create new user (Admin or Student)
 * 
 * Required Role: SUPER_ADMIN
 * Body: { email, password, role, schoolId, name, grade?, enrollmentId? }
 * Response: { success, user: { id, email, role, schoolId } }
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

        // Check role (SUPER_ADMIN required)
        const roleError = requireRole(payload, ['SUPER_ADMIN']);
        if (roleError) return roleError;

        const { email, password, role, schoolId, name, grade, enrollmentId } = await req.json();

        if (!email || !password || !role || !schoolId || !name) {
            return errorResponse('Missing required fields: email, password, role, schoolId, name', req, 400);
        }

        const supabase = getSupabaseAdmin();

        // 1. Create Auth User
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role, schoolId },
        });

        if (userError) throw userError;

        const userId = userData.user.id;

        // 2. Create Database Record in public.users
        const { error: dbError } = await supabase.from('users').insert({
            id: userId,
            email,
            name,
            role,
            password_hash: 'MANAGED_BY_SUPABASE_AUTH',
            school_id: schoolId,
        });

        if (dbError) {
            // Rollback auth user on DB failure
            await supabase.auth.admin.deleteUser(userId);
            throw dbError;
        }

        // 3. If Student, create student record
        if (role === 'STUDENT') {
            const { error: studentError } = await supabase.from('students').insert({
                user_id: userId,
                school_id: schoolId,
                grade: grade || null,
                enrollment_id: enrollmentId || null,
                marks_balance: 0,
            });

            if (studentError) throw studentError;
        }

        return jsonResponse({
            success: true,
            user: { id: userId, email, role, schoolId },
        }, req);

    } catch (error) {
        console.error('[admin-users-create] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
