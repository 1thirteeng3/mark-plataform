/**
 * PUT /schools-students-update
 * Update a student's profile
 * 
 * Required Role: ADMIN
 * Body: { studentId, name?, email?, password? }
 * Response: { success: true }
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

    const { studentId, name, email, password } = await req.json();

    if (!studentId) {
      return errorResponse('Student ID required', req, 400);
    }

    const supabase = getSupabaseAdmin();

    // Verify student belongs to admin's school
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('user_id, school_id')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return errorResponse('Student not found', req, 404);
    }

    if (student.school_id !== payload.schoolId) {
      return errorResponse('Unauthorized access to this student', req, 403);
    }

    const updates: Record<string, unknown> = {};
    const authUpdates: Record<string, unknown> = {};

    if (name) {
      updates.name = name;
      authUpdates.user_metadata = { name };
    }
    if (email) {
      updates.email = email;
      authUpdates.email = email;
    }
    if (password) {
      authUpdates.password = password;
    }

    // Update database records
    if (Object.keys(updates).length > 0) {
      await supabase.from('students').update(updates).eq('id', studentId);
      await supabase.from('users').update(updates).eq('id', student.user_id);
    }

    // Update Auth user
    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        student.user_id,
        authUpdates
      );
      if (authError) throw authError;
    }

    return jsonResponse({ success: true, message: 'Student updated successfully' }, req);

  } catch (error) {
    console.error('[schools-students-update] Error:', error);
    return errorResponse(error.message, req, 500);
  }
});
