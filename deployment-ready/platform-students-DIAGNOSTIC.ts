// DIAGNOSTIC VERSION - platform-students
// This version will help identify the exact error cause

function validateSuperAdminToken(req: Request): { userId: string; role: string; schoolId: string | null } {
    // In demo mode, allow requests without tokens
    const token = req.headers.get('x-user-token');
    console.log('Token received:', token ? 'present' : 'missing');
    
    return { userId: 'demo-user', role: 'SUPER_ADMIN', schoolId: null };
}

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('=== DIAGNOSTIC START ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);

        validateSuperAdminToken(req);

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;
        
        console.log('Page:', page, 'Limit:', limit, 'Offset:', offset);

        // Check environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        console.log('SUPABASE_URL:', supabaseUrl ? 'present' : 'MISSING');
        console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'present' : 'MISSING');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error(`Supabase configuration missing - URL: ${!!supabaseUrl}, Key: ${!!serviceRoleKey}`);
        }

        const headers = {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
        };

        console.log('Headers configured');

        // Test basic connectivity to students table
        const studentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?select=id,marks_balance,user_id,school_id&order=created_at.desc&limit=1&offset=0`,
            { headers }
        );

        console.log('Students query response status:', studentsResponse.status);
        console.log('Students query response ok:', studentsResponse.ok);
        
        if (!studentsResponse.ok) {
            const errorText = await studentsResponse.text();
            console.error('Students query failed:', errorText);
            throw new Error(`Students table query failed: ${studentsResponse.status} ${studentsResponse.statusText}`);
        }

        const students = await studentsResponse.json();
        console.log('Students query succeeded, got data:', Array.isArray(students) ? 'array' : typeof students, 'length:', Array.isArray(students) ? students.length : 'N/A');
        
        // Return diagnostic success
        return new Response(JSON.stringify({
            diagnostic: true,
            message: 'Students endpoint diagnostic completed successfully',
            data: {
                method: req.method,
                url: req.url,
                page,
                limit,
                environment: {
                    supabaseUrl: !!supabaseUrl,
                    serviceRoleKey: !!serviceRoleKey
                },
                studentsQuery: {
                    status: studentsResponse.status,
                    ok: studentsResponse.ok,
                    dataType: Array.isArray(students) ? 'array' : typeof students,
                    dataLength: Array.isArray(students) ? students.length : 'N/A'
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('=== DIAGNOSTIC ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        const errorResponse = {
            diagnostic: true,
            error: {
                code: 'DIAGNOSTIC_FAILED',
                message: error.message,
                stack: error.stack
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});