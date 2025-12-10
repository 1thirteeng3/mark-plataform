// GET /platform-students?page=1&limit=20
// List all students with pagination
// Response: { students: [{ id, name, email, schoolName, marksBalance }], totalCount, page, limit }

// SHARED HELPER: Inlined for manual deployment compatibility
async function validateAdminToken(token: string): Promise<{
    valid: boolean;
    payload?: {
        userId: string;
        email: string;
        role: string;
        schoolId: string;
        exp: number;
    };
}> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return { valid: false };
        const [headerB64, payloadB64, signatureB64] = parts;
        const payload = JSON.parse(atob(payloadB64));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return { valid: false };
        const jwtSecret = Deno.env.get('JWT_SECRET_V1') || 'mark-platform-secret-key-2024';
        const expectedSignature = await createHmacSignature(`${headerB64}.${payloadB64}`, jwtSecret);
        if (expectedSignature !== signatureB64) {
            const jwtSecretV2 = Deno.env.get('JWT_SECRET_V2');
            if (jwtSecretV2) {
                const expectedSignatureV2 = await createHmacSignature(`${headerB64}.${payloadB64}`, jwtSecretV2);
                if (expectedSignatureV2 !== signatureB64) return { valid: false };
            } else {
                return { valid: false };
            }
        }
        if (payload.iss !== 'mark-platform') return { valid: false };
        return {
            valid: true,
            payload: {
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
                schoolId: payload.schoolId,
                exp: payload.exp,
            }
        };
    } catch (error) {
        console.error('Token validation error:', error);
        return { valid: false };
    }
}

async function createHmacSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const dataBuffer = encoder.encode(data);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
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
        // Validate admin token
        const authHeader = req.headers.get('x-user-token') || req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authentication token provided');
        }

        const token = authHeader.replace('Bearer ', '');
        const validation = await validateAdminToken(token);

        if (!validation.valid || !validation.payload || validation.payload.role !== 'SUPER_ADMIN') {
            throw new Error('Invalid token or insufficient permissions');
        }

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
