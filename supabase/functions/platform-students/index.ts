// GET /platform-students?page=1&limit=20
// List all students with pagination
// Response: { students: [{ id, name, email, schoolName, marksBalance }], totalCount, page, limit }

function validateSuperAdminToken(req: Request): { userId: string; role: string; schoolId: string | null } {
    const token = req.headers.get('x-user-token');
    if (!token) throw new Error('No authentication token provided');
    const parts = token.split('.');
    if (parts.length !== 2 || parts[0] !== 'Bearer') throw new Error('Invalid token format');
    try {
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) throw new Error('Token expired');
        if (payload.role !== 'SUPER_ADMIN') throw new Error('Insufficient permissions - SUPER_ADMIN access required');
        return { userId: payload.userId, role: payload.role, schoolId: payload.schoolId || null };
    } catch (error) {
        throw new Error('Invalid token');
    }
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
        validateSuperAdminToken(req);

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        const headers = {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
        };

        // Fetch students with count
        const studentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?select=id,marks_balance,user_id,school_id&order=created_at.desc&limit=${limit}&offset=${offset}`,
            { headers }
        );

        if (!studentsResponse.ok) {
            const errorText = await studentsResponse.text();
            console.error('Failed to fetch students:', studentsResponse.status, studentsResponse.statusText, errorText);
            throw new Error(`Failed to fetch students: ${studentsResponse.status} ${studentsResponse.statusText}`);
        }

        const students = await studentsResponse.json();
        
        // If no students, return empty result early
        if (!Array.isArray(students) || students.length === 0) {
            return new Response(JSON.stringify({
                students: [],
                totalCount: 0,
                page,
                limit
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        const totalCount = parseInt(studentsResponse.headers.get('content-range')?.split('/')[1] || '0');

        // Fetch all unique user IDs and school IDs
        const userIds = [...new Set(students.map((s: any) => s.user_id))].filter(id => id);
        const schoolIds = [...new Set(students.map((s: any) => s.school_id))].filter(id => id);

        // Defensive check: if no valid IDs, return students with Unknown labels
        if (userIds.length === 0 && schoolIds.length === 0) {
            const formattedStudents = students.map((student: any) => ({
                id: student.id,
                name: 'Unknown',
                email: 'Unknown',
                schoolName: 'Unknown',
                marksBalance: student.marks_balance
            }));
            
            return new Response(JSON.stringify({
                students: formattedStudents,
                totalCount,
                page,
                limit
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Fetch users and schools (only if IDs exist)
        const fetchPromises = [];
        if (userIds.length > 0) {
            fetchPromises.push(
                fetch(`${supabaseUrl}/rest/v1/users?id=in.(${userIds.join(',')})&select=id,name,email`, { headers })
            );
        } else {
            fetchPromises.push(Promise.resolve({ json: async () => [] }));
        }
        
        if (schoolIds.length > 0) {
            fetchPromises.push(
                fetch(`${supabaseUrl}/rest/v1/schools?id=in.(${schoolIds.join(',')})&select=id,name`, { headers })
            );
        } else {
            fetchPromises.push(Promise.resolve({ json: async () => [] }));
        }

        const [usersResponse, schoolsResponse] = await Promise.all(fetchPromises);

        const users = await usersResponse.json();
        const schools = await schoolsResponse.json();

        // Create lookup maps
        const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
        const schoolMap = Object.fromEntries(schools.map((s: any) => [s.id, s]));

        // Transform to camelCase with joined data
        const formattedStudents = students.map((student: any) => {
            const user = userMap[student.user_id] || {};
            const school = schoolMap[student.school_id] || {};
            return {
                id: student.id,
                name: user.name || 'Unknown',
                email: user.email || 'Unknown',
                schoolName: school.name || 'Unknown',
                marksBalance: student.marks_balance
            };
        });

        return new Response(JSON.stringify({
            students: formattedStudents,
            totalCount,
            page,
            limit
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Platform students error:', error);

        const errorResponse = {
            error: {
                code: 'STUDENTS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: error.message.includes('permissions') ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
