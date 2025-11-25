// Schools Analytics - Financial Metrics
// Module 3: Data Intelligence (Dashboards)
// Returns financial analytics: burn rate, circulating marks, liability

import { validateAdminToken } from '../_shared/validateAdminToken.ts';

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 200 });
    }

    try {
        // Validate admin token
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Token de autenticação ausente' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const validation = await validateAdminToken(token);
        
        if (!validation.valid || !validation.payload) {
            return new Response(
                JSON.stringify({ error: 'Token inválido ou usuário não autorizado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const { schoolId, role } = validation.payload;

        // Both ADMIN and SUPER_ADMIN can access analytics
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            return new Response(
                JSON.stringify({ error: 'Acesso negado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const targetSchoolId = role === 'SUPER_ADMIN' 
            ? new URL(req.url).searchParams.get('schoolId') || schoolId
            : schoolId;

        // Get financial summary from view
        const summaryResponse = await fetch(
            `${supabaseUrl}/rest/v1/school_financial_summary?school_id=eq.${targetSchoolId}`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        if (!summaryResponse.ok) {
            throw new Error('Failed to fetch financial summary');
        }

        const summaries = await summaryResponse.json();
        const summary = summaries.length > 0 ? summaries[0] : {
            total_circulating_marks: 0,
            total_students: 0,
            students_with_balance: 0,
        };

        // Get 30-day analytics from materialized view
        const analyticsResponse = await fetch(
            `${supabaseUrl}/rest/v1/analytics_school_engagement?school_id=eq.${targetSchoolId}&order=ref_date.desc&limit=30`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        if (!analyticsResponse.ok) {
            throw new Error('Failed to fetch analytics');
        }

        const analytics = await analyticsResponse.json();

        // Calculate burn rate
        const totalMinted = analytics.reduce((sum: number, day: any) => sum + (day.total_minted || 0), 0);
        const totalRedeemed = analytics.reduce((sum: number, day: any) => sum + (day.total_redeemed || 0), 0);
        const totalExpired = analytics.reduce((sum: number, day: any) => sum + (day.total_expired || 0), 0);

        const burnRate = totalMinted > 0 
            ? ((totalRedeemed + totalExpired) / totalMinted * 100).toFixed(2)
            : '0.00';

        // Calculate velocity (marks per active student per day)
        const avgActiveStudents = analytics.length > 0
            ? analytics.reduce((sum: number, day: any) => sum + (day.active_students || 0), 0) / analytics.length
            : 0;

        const velocity = avgActiveStudents > 0
            ? (totalMinted / avgActiveStudents / 30).toFixed(2)
            : '0.00';

        return new Response(
            JSON.stringify({
                schoolId: targetSchoolId,
                period: '30 days',
                financial: {
                    circulatingMarks: summary.total_circulating_marks,
                    totalStudents: summary.total_students,
                    studentsWithBalance: summary.students_with_balance,
                    liability: summary.total_circulating_marks,
                },
                metrics: {
                    totalMinted,
                    totalRedeemed,
                    totalExpired,
                    burnRate: parseFloat(burnRate),
                    velocity: parseFloat(velocity),
                },
                timeline: analytics.map((day: any) => ({
                    date: day.ref_date,
                    activeStudents: day.active_students,
                    minted: day.total_minted,
                    redeemed: day.total_redeemed,
                    expired: day.total_expired,
                })),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Financial analytics error:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Erro ao buscar analytics financeiro',
                details: error.message 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
