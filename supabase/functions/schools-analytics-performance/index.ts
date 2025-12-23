/**
 * GET /schools-analytics-performance
 * Performance Metrics: top students, top rules, class engagement
 * 
 * Required Role: ADMIN or SUPER_ADMIN
 * Response: { schoolId, overview, classPerformance, topStudents, topRules }
 */

import { requireAuth, requireRole } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAdminHeaders, getRestUrl } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;
        const { payload } = authResult;

        const roleError = requireRole(payload, ['ADMIN', 'SUPER_ADMIN']);
        if (roleError) return roleError;

        const { schoolId, role } = payload;
        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Determine target school
        let targetSchoolId = role === 'SUPER_ADMIN'
            ? new URL(req.url).searchParams.get('schoolId') || schoolId
            : schoolId;

        // Fallback for SUPER_ADMIN
        if (!targetSchoolId && role === 'SUPER_ADMIN') {
            const schoolsRes = await fetch(`${restUrl}/schools?select=id&limit=1`, { headers });
            const schools = await schoolsRes.json();
            if (schools.length > 0) targetSchoolId = schools[0].id;
        }

        if (!targetSchoolId) {
            return errorResponse('Nenhuma escola encontrada', req, 400);
        }

        // Fetch data in parallel
        const [topStudentsRes, topRulesRes, classPerformanceRes] = await Promise.all([
            fetch(`${restUrl}/top_students_by_school?school_id=eq.${targetSchoolId}&rank=lte.10&order=rank.asc`, { headers }),
            fetch(`${restUrl}/top_rules_by_school?school_id=eq.${targetSchoolId}&order=times_triggered.desc&limit=10`, { headers }),
            fetch(`${restUrl}/analytics_class_performance?school_id=eq.${targetSchoolId}&order=engagement_score.desc`, { headers }),
        ]);

        const topStudents = await topStudentsRes.json();
        const topRules = await topRulesRes.json();
        const classPerformance = classPerformanceRes.ok ? await classPerformanceRes.json() : [];

        // Calculate overview
        const overview = classPerformance.length > 0 ? {
            totalStudents: classPerformance.reduce((s: number, c: any) => s + c.total_students, 0),
            activeStudents: classPerformance.reduce((s: number, c: any) => s + c.active_students, 0),
            avgEngagement: +(classPerformance.reduce((s: number, c: any) => s + c.engagement_score, 0) / classPerformance.length).toFixed(2),
        } : { totalStudents: 0, activeStudents: 0, avgEngagement: 0 };

        return jsonResponse({
            schoolId: targetSchoolId,
            overview,
            classPerformance: classPerformance.map((c: any) => ({
                grade: c.grade, totalStudents: c.total_students, activeStudents: c.active_students, engagementScore: c.engagement_score,
            })),
            topStudents: topStudents.map((s: any) => ({
                rank: s.rank, studentId: s.student_id, name: s.student_name, currentBalance: s.marks_balance, lifetimeEarned: s.lifetime_earned, lifetimeSpent: s.lifetime_spent,
            })),
            topRules: topRules.map((r: any) => ({
                ruleId: r.rule_id, ruleName: r.rule_name, marksAwarded: r.marks_to_award, timesTriggered: r.times_triggered, totalMarksAwarded: r.total_marks_awarded,
            })),
        }, req);

    } catch (error) {
        console.error('[schools-analytics-performance] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
