/**
 * GET /platform-students?page=1&limit=20
 * List all students with pagination
 * 
 * Required Role: SUPER_ADMIN or ADMIN
 * Response: { students: [{ id, name, email, schoolName, marksBalance }], totalCount, page, limit }
 */

import { requireAuth, requireRole } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAdminHeaders, getRestUrl } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        // Authenticate user
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        const { payload } = authResult;

        // Check role (SUPER_ADMIN or ADMIN)
        const roleError = requireRole(payload, ['SUPER_ADMIN', 'ADMIN']);
        if (roleError) return roleError;

        // Parse pagination params
        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
        const offset = (page - 1) * limit;

        const restUrl = getRestUrl();
        const headers = { ...getAdminHeaders(), 'Prefer': 'count=exact' };

        // Fetch students with count
        const studentsResponse = await fetch(
            `${restUrl}/students?select=id,marks_balance,user_id,school_id&order=created_at.desc&limit=${limit}&offset=${offset}`,
            { headers }
        );

        if (!studentsResponse.ok) {
            throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
        }

        const students = await studentsResponse.json();
        const totalCount = parseInt(studentsResponse.headers.get('content-range')?.split('/')[1] || '0');

        // Handle empty result
        if (!Array.isArray(students) || students.length === 0) {
            return jsonResponse({ students: [], totalCount: 0, page, limit }, req);
        }

        // Get unique IDs for lookups
        const userIds = [...new Set(students.map((s: any) => s.user_id))].filter(Boolean);
        const schoolIds = [...new Set(students.map((s: any) => s.school_id))].filter(Boolean);

        // Fetch related data in parallel
        const [usersRes, schoolsRes] = await Promise.all([
            userIds.length > 0
                ? fetch(`${restUrl}/users?id=in.(${userIds.join(',')})&select=id,name,email`, { headers })
                : Promise.resolve({ json: async () => [] }),
            schoolIds.length > 0
                ? fetch(`${restUrl}/schools?id=in.(${schoolIds.join(',')})&select=id,name`, { headers })
                : Promise.resolve({ json: async () => [] }),
        ]);

        const users = await usersRes.json();
        const schools = await schoolsRes.json();

        // Create lookup maps
        const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
        const schoolMap = Object.fromEntries(schools.map((s: any) => [s.id, s]));

        // Transform data
        const formattedStudents = students.map((student: any) => {
            const user = userMap[student.user_id] || {};
            const school = schoolMap[student.school_id] || {};
            return {
                id: student.id,
                name: user.name || 'Unknown',
                email: user.email || 'Unknown',
                schoolName: school.name || 'Unknown',
                marksBalance: student.marks_balance,
            };
        });

        return jsonResponse({ students: formattedStudents, totalCount, page, limit }, req);

    } catch (error) {
        console.error('[platform-students] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
