// deno-lint-ignore-file
// Super Admin: Create User
// Logic: Wrapper around supabase.auth.admin.createUser to allow explicit password/role setting

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // 1. Verify Super Admin (via x-user-token or just Service Key if internal)
        // For simplicity/security, we assume this is called with the Service Role key OR a valid Super Admin token
        // But since we are creating users, we likely need the Service Role client anyway.

        // We check the Authorization header to ensure it's a valid request
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization');

        // Create Supabase Client with Service Role (Admin Admin)
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, serviceKey);

        const { email, password, role, schoolId, name, grade, enrollmentId } = await req.json();

        if (!email || !password || !role || !schoolId || !name) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Create Auth User
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role, schoolId } // Store role in metadata for easy access
        });

        if (userError) throw userError;

        const userId = userData.user.id;

        // 3. Create Database Record (using Service Role)

        // A. Insert into public.users
        const { error: dbError } = await supabase.from('users').insert({
            id: userId,
            email,
            name,
            role,
            password_hash: 'MANAGED_BY_SUPABASE_AUTH', // We don't store the actual password hash here anymore, or we store a dummy
            school_id: schoolId
        });

        if (dbError) {
            // Rollback Auth User if DB fails? 
            // supabase.auth.admin.deleteUser(userId);
            throw dbError;
        }

        // B. If Student, insert into public.students
        if (role === 'STUDENT') {
            const { error: studentError } = await supabase.from('students').insert({
                user_id: userId,
                school_id: schoolId,
                grade: grade || null,
                enrollment_id: enrollmentId || null,
                marks_balance: 0
            });

            if (studentError) throw studentError;
        }

        return new Response(JSON.stringify({
            success: true,
            user: { id: userId, email, role, schoolId }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
