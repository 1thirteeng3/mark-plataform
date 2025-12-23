/**
 * POST /schools-rules-create
 * Create new achievement rule
 * 
 * Required Role: ADMIN
 * Body: { ruleName: string, marksToAward: number }
 * Response: { id, ruleName, marksToAward, isActive, createdAt }
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
        const roleError = requireRole(payload, ['ADMIN']);
        if (roleError) return roleError;

        const { ruleName, marksToAward } = await req.json();

        if (!ruleName || !marksToAward) {
            return errorResponse('Rule name and marks to award are required', req, 400);
        }

        if (marksToAward <= 0) {
            return errorResponse('Marks to award must be positive', req, 400);
        }

        const restUrl = getRestUrl();
        const headers = { ...getAdminHeaders(), 'Prefer': 'return=representation' };

        // Insert new rule
        const insertResponse = await fetch(`${restUrl}/school_rules`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                school_id: payload.schoolId,
                rule_name: ruleName,
                marks_to_award: marksToAward,
                is_active: true,
            }),
        });

        if (!insertResponse.ok) {
            throw new Error('Database insert failed');
        }

        const rule = (await insertResponse.json())[0];

        return jsonResponse({
            id: rule.id,
            ruleName: rule.rule_name,
            marksToAward: rule.marks_to_award,
            isActive: rule.is_active,
            createdAt: rule.created_at,
        }, req);

    } catch (error) {
        console.error('[schools-rules-create] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
