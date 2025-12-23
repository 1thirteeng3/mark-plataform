/**
 * GET /schools-analytics-financial
 * Financial Metrics: burn rate, circulating marks, liability
 * 
 * Required Role: ADMIN or SUPER_ADMIN
 * Response: { schoolId, period, financial, metrics, timeline }
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

        if (targetSchoolId) {
            // Single school mode
            const [summaryRes, analyticsRes] = await Promise.all([
                fetch(`${restUrl}/school_financial_summary?school_id=eq.${targetSchoolId}`, { headers }),
                fetch(`${restUrl}/analytics_school_engagement?school_id=eq.${targetSchoolId}&order=ref_date.desc&limit=30`, { headers }),
            ]);

            const summaries = await summaryRes.json();
            const analytics = await analyticsRes.json();

            const summary = summaries[0] || { total_circulating_marks: 0, total_students: 0, students_with_balance: 0 };
            const totalMinted = analytics.reduce((s: number, d: any) => s + (d.total_minted || 0), 0);
            const totalRedeemed = analytics.reduce((s: number, d: any) => s + (d.total_redeemed || 0), 0);
            const totalExpired = analytics.reduce((s: number, d: any) => s + (d.total_expired || 0), 0);
            const burnRate = totalMinted > 0 ? ((totalRedeemed + totalExpired) / totalMinted * 100) : 0;
            const avgActive = analytics.length > 0 ? analytics.reduce((s: number, d: any) => s + (d.active_students || 0), 0) / analytics.length : 0;
            const velocity = avgActive > 0 ? (totalMinted / avgActive / 30) : 0;

            return jsonResponse({
                schoolId: targetSchoolId,
                period: '30 days',
                financial: {
                    circulatingMarks: summary.total_circulating_marks,
                    totalStudents: summary.total_students,
                    studentsWithBalance: summary.students_with_balance,
                    liability: summary.total_circulating_marks,
                },
                metrics: { totalMinted, totalRedeemed, totalExpired, burnRate: +burnRate.toFixed(2), velocity: +velocity.toFixed(2) },
                timeline: analytics.map((d: any) => ({
                    date: d.ref_date, activeStudents: d.active_students, minted: d.total_minted, redeemed: d.total_redeemed, expired: d.total_expired,
                })),
            }, req);

        } else if (role === 'SUPER_ADMIN') {
            // Global mode
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [summaryRes, analyticsRes] = await Promise.all([
                fetch(`${restUrl}/school_financial_summary`, { headers }),
                fetch(`${restUrl}/analytics_school_engagement?ref_date=gte.${thirtyDaysAgo.toISOString().split('T')[0]}&order=ref_date.desc`, { headers }),
            ]);

            const allSummaries = await summaryRes.json();
            const allAnalytics = await analyticsRes.json();

            const globalSummary = allSummaries.reduce((acc: any, c: any) => ({
                total_circulating_marks: acc.total_circulating_marks + (c.total_circulating_marks || 0),
                total_students: acc.total_students + (c.total_students || 0),
                students_with_balance: acc.students_with_balance + (c.students_with_balance || 0),
            }), { total_circulating_marks: 0, total_students: 0, students_with_balance: 0 });

            // Group by date
            const grouped: Record<string, any> = {};
            allAnalytics.forEach((d: any) => {
                if (!grouped[d.ref_date]) grouped[d.ref_date] = { ref_date: d.ref_date, active_students: 0, total_minted: 0, total_redeemed: 0, total_expired: 0 };
                grouped[d.ref_date].active_students += d.active_students || 0;
                grouped[d.ref_date].total_minted += d.total_minted || 0;
                grouped[d.ref_date].total_redeemed += d.total_redeemed || 0;
                grouped[d.ref_date].total_expired += d.total_expired || 0;
            });

            const timeline = Object.values(grouped).sort((a: any, b: any) => new Date(b.ref_date).getTime() - new Date(a.ref_date).getTime()).slice(0, 30);
            const totalMinted = timeline.reduce((s: number, d: any) => s + d.total_minted, 0);
            const totalRedeemed = timeline.reduce((s: number, d: any) => s + d.total_redeemed, 0);
            const totalExpired = timeline.reduce((s: number, d: any) => s + d.total_expired, 0);
            const burnRate = totalMinted > 0 ? ((totalRedeemed + totalExpired) / totalMinted * 100) : 0;
            const avgActive = timeline.length > 0 ? timeline.reduce((s: number, d: any) => s + d.active_students, 0) / timeline.length : 0;
            const velocity = avgActive > 0 ? (totalMinted / avgActive / 30) : 0;

            return jsonResponse({
                schoolId: 'GLOBAL', period: '30 days',
                financial: { circulatingMarks: globalSummary.total_circulating_marks, totalStudents: globalSummary.total_students, studentsWithBalance: globalSummary.students_with_balance, liability: globalSummary.total_circulating_marks },
                metrics: { totalMinted, totalRedeemed, totalExpired, burnRate: +burnRate.toFixed(2), velocity: +velocity.toFixed(2) },
                timeline: timeline.map((d: any) => ({ date: d.ref_date, activeStudents: d.active_students, minted: d.total_minted, redeemed: d.total_redeemed, expired: d.total_expired })),
            }, req);
        }

        return errorResponse('Nenhuma escola encontrada', req, 400);

    } catch (error) {
        console.error('[schools-analytics-financial] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
