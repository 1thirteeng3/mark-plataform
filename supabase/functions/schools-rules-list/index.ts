/**
 * GET /schools-rules-list
 * List achievement rules for school
 * 
 * Required Role: ADMIN
 * Response: [{ id, ruleName, marksToAward, isActive, createdAt }]
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

        // Check role (ADMIN required)
        const roleError = requireRole(payload, ['ADMIN', 'SUPER_ADMIN']);
        if (roleError) return roleError;

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Query rules for this school
        const rulesResponse = await fetch(
            `${restUrl}/school_rules?school_id=eq.${payload.schoolId}&order=created_at.desc`,
            { headers }
        );

        if (!rulesResponse.ok) {
            throw new Error('Database query failed');
        }

        const rules = await rulesResponse.json();

        // Convert to camelCase
        const formattedRules = rules.map((r: any) => ({
            id: r.id,
            ruleName: r.rule_name,
            marksToAward: r.marks_to_award,
            isActive: r.is_active,
            createdAt: r.created_at,
        }));

        return jsonResponse(formattedRules, req);

    } catch (error) {
        console.error('[schools-rules-list] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
