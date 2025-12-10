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
        const { name, email, password } = await req.json();
        if (!name || !email || !password) throw new Error('Missing required fields');

        // 3. Create Auth User
        const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'STUDENT', name } // Store simple metadata
        });

        if (createError) throw createError;
        if (!authData.user) throw new Error('Failed to create auth user');

        // 4. Create Student Record
        // Note: The 'users' table trigger might auto-create a user record, 
        // but 'students' table is separate. We need to create the student profile explicitly.
        // And ideally, we also ensure the 'users' table has the correct role if the trigger didn't handle it perfectly.

        // Force update users table role (just in case trigger defaults to something else or doesn't invoke)
        await supabaseClient.from('users').upsert({
            id: authData.user.id,
            email: email,
            name: name,
            role: 'STUDENT',
            school_id: adminUser.school_id, // Link to Admin's School
            created_at: new Date().toISOString()
        });

        // Insert into students table
        const { data: student, error: studentError } = await supabaseClient
            .from('students')
            .insert({
                user_id: authData.user.id,
                school_id: adminUser.school_id,
                email: email,
                name: name,
                marks_balance: 0 // Start with 0
            })
            .select()
            .single();

        if (studentError) {
            // Rollback Auth User if Student creation fails (Manual compensation)
            await supabaseClient.auth.admin.deleteUser(authData.user.id);
            throw studentError;
        }

        return new Response(
            JSON.stringify(student),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: { message: error.message } }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
