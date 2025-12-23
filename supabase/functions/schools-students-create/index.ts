/**
 * POST /schools-students-create
 * Create a new student for the school
 * 
 * Required Role: ADMIN
 * Body: { name, email, password }
 * Response: Student object
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
        const roleError = requireRole(payload, ['ADMIN']);
        if (roleError) return roleError;

        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return errorResponse('Missing required fields: name, email, password', req, 400);
        }

        const supabase = getSupabaseAdmin();

        // Create Auth User
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'STUDENT', name },
        });

        if (createError) throw createError;
        if (!authData.user) throw new Error('Failed to create auth user');

        // Create users table record
        await supabase.from('users').upsert({
            id: authData.user.id,
            email,
            name,
            role: 'STUDENT',
            school_id: payload.schoolId,
            created_at: new Date().toISOString(),
        });

        // Create student record
        const { data: student, error: studentError } = await supabase
            .from('students')
            .insert({
                user_id: authData.user.id,
                school_id: payload.schoolId,
                email,
                name,
                marks_balance: 0,
            })
            .select()
            .single();

        if (studentError) {
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw studentError;
        }

        return jsonResponse(student, req);

    } catch (error) {
        console.error('[schools-students-create] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
