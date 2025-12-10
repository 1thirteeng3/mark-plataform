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

        // 1. Validate User Token
        const userToken = req.headers.get('x-user-token');
        if (!userToken) throw new Error('User token required');

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(userToken);
        if (userError || !user) throw new Error('Invalid user token');

        // 2. Verify Role (Must be ADMIN)
        const { data: dbUser, error: roleError } = await supabaseClient
            .from('users')
            .select('role, school_id')
            .eq('id', user.id)
            .single();

        if (roleError || !dbUser) throw new Error('User not found');
        if (dbUser.role !== 'ADMIN') throw new Error('Unauthorized');

        // 3. Parse Pagination
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') ?? '1');
        const limit = parseInt(url.searchParams.get('limit') ?? '20');
        const offset = (page - 1) * limit;

        // 4. Fetch Students (Scoped to School)
        const { data: students, count, error: listError } = await supabaseClient
            .from('students')
            .select('*', { count: 'exact' })
            .eq('school_id', dbUser.school_id)
            .range(offset, offset + limit - 1)
            .order('name', { ascending: true });

        if (listError) throw listError;

        return new Response(
            JSON.stringify({
                data: students,
                meta: {
                    page,
                    limit,
                    total: count
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: { message: error.message } }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
