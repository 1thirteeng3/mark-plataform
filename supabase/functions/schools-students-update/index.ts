import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Auth & Role Check
    const userToken = req.headers.get('x-user-token');
    if (!userToken) throw new Error('User token required');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(userToken);
    if (userError || !user) throw new Error('Invalid user token');

    const { data: adminUser, error: roleError } = await supabaseClient
      .from('users')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (roleError || !adminUser || adminUser.role !== 'ADMIN') throw new Error('Unauthorized');

    // 2. Parse Input
    const { studentId, name, email, password } = await req.json();
    if (!studentId) throw new Error('Student ID required');

    // 3. Verify Ownership (Student belongs to School)
    const { data: student, error: fetchError } = await supabaseClient
      .from('students')
      .select('user_id, school_id')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) throw new Error('Student not found');
    if (student.school_id !== adminUser.school_id) throw new Error('Unauthorized access to this student');

    const updates: any = {};
    const authUpdates: any = {};

    if (name) {
      updates.name = name;
      authUpdates.user_metadata = { ...authUpdates.user_metadata, name };
    }
    if (email) {
      updates.email = email;
      authUpdates.email = email;
    }
    if (password) {
      authUpdates.password = password;
    }

    // 4. Update Database Record
    if (Object.keys(updates).length > 0) {
      const { error: updateDbError } = await supabaseClient
        .from('students')
        .update(updates)
        .eq('id', studentId);

      if (updateDbError) throw updateDbError;

      // Also update 'users' table public profile
      await supabaseClient
        .from('users')
        .update(updates)
        .eq('id', student.user_id);
    }

    // 5. Update Auth User (if email/password/metadata changed)
    if (Object.keys(authUpdates).length > 0) {
      const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
        student.user_id,
        authUpdates
      );
      if (updateAuthError) throw updateAuthError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Student updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
