/**
 * GET /auth-me
 * Get current authenticated user profile
 * 
 * Headers: Authorization: Bearer {token}
 * Response: { id, name, email, role, schoolId }
 */

import { requireAuth } from "../_shared/auth.ts";
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

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Query user by ID from token
        const userResponse = await fetch(
            `${restUrl}/users?id=eq.${payload.userId}`,
            { headers }
        );

        if (!userResponse.ok) {
            throw new Error('Database query failed');
        }

        const users = await userResponse.json();

        if (!users || users.length === 0) {
            return errorResponse('User not found', req, 404);
        }

        const user = users[0];

        return jsonResponse({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            schoolId: user.school_id,
        }, req);

    } catch (error) {
        console.error('[auth-me] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
