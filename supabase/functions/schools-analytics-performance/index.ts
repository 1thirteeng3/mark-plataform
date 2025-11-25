// Schools Analytics - Performance Metrics
// Module 3: Data Intelligence (Dashboards)
// Returns performance analytics: top students, top rules, engagement metrics

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

        // Get top students (limit 10)
        const topStudentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/top_students_by_school?school_id=eq.${targetSchoolId}&rank=lte.10&order=rank.asc`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        if (!topStudentsResponse.ok) {
            throw new Error('Failed to fetch top students');
        }

        const topStudents = await topStudentsResponse.json();

        // Get top rules
        const topRulesResponse = await fetch(
            `${supabaseUrl}/rest/v1/top_rules_by_school?school_id=eq.${targetSchoolId}&order=times_triggered.desc&limit=10`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        if (!topRulesResponse.ok) {
            throw new Error('Failed to fetch top rules');
        }

        const topRules = await topRulesResponse.json();

        // Get grade/class performance (if enrollment data is available)
        // For now, we'll return aggregated student performance
        const performanceQuery = `
            SELECT 
                COUNT(DISTINCT s.id) as total_students,
                AVG(s.marks_balance) as avg_balance,
                SUM(CASE WHEN s.marks_balance > 0 THEN 1 ELSE 0 END) as active_students
            FROM students s
            WHERE s.school_id = '${targetSchoolId}'
        `;

        const performanceResponse = await fetch(
            `${supabaseUrl}/rest/v1/rpc/exec_sql`,
            {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: performanceQuery }),
            }
        );

        let schoolPerformance = {
            totalStudents: 0,
            avgBalance: 0,
            activeStudents: 0,
            engagementRate: 0,
        };

        // Fallback: Calculate manually if RPC fails
        const studentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?school_id=eq.${targetSchoolId}&select=marks_balance`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        if (studentsResponse.ok) {
            const students = await studentsResponse.json();
            const totalStudents = students.length;
            const activeStudents = students.filter((s: any) => s.marks_balance > 0).length;
            const totalBalance = students.reduce((sum: number, s: any) => sum + s.marks_balance, 0);
            const avgBalance = totalStudents > 0 ? totalBalance / totalStudents : 0;
            const engagementRate = totalStudents > 0 ? (activeStudents / totalStudents * 100) : 0;

            schoolPerformance = {
                totalStudents,
                avgBalance: Math.round(avgBalance * 100) / 100,
                activeStudents,
                engagementRate: Math.round(engagementRate * 100) / 100,
            };
        }

        return new Response(
            JSON.stringify({
                schoolId: targetSchoolId,
                performance: schoolPerformance,
                topStudents: topStudents.map((student: any) => ({
                    rank: student.rank,
                    studentId: student.student_id,
                    name: student.student_name,
                    currentBalance: student.marks_balance,
                    lifetimeEarned: student.lifetime_earned,
                    lifetimeSpent: student.lifetime_spent,
                })),
                topRules: topRules.map((rule: any) => ({
                    ruleId: rule.rule_id,
                    ruleName: rule.rule_name,
                    marksAwarded: rule.marks_to_award,
                    timesTriggered: rule.times_triggered,
                    totalMarksAwarded: rule.total_marks_awarded,
                })),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Performance analytics error:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Erro ao buscar analytics de desempenho',
                details: error.message 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
