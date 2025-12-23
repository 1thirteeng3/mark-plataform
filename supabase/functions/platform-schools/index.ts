/**
 * GET /platform-schools
 * List all schools
 * 
 * Required Role: SUPER_ADMIN or ADMIN
 * Response: [{ id, name, createdAt }]
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

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Fetch all schools
        const schoolsResponse = await fetch(
            `${restUrl}/schools?select=id,name,created_at&order=created_at.desc`,
            { headers }
        );

        if (!schoolsResponse.ok) {
            throw new Error('Failed to fetch schools');
        }

        const schools = await schoolsResponse.json();

        // Transform to camelCase
        const formattedSchools = schools.map((school: any) => ({
            id: school.id,
            name: school.name,
            createdAt: school.created_at,
        }));

        return jsonResponse(formattedSchools, req);

    } catch (error) {
        console.error('[platform-schools] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
