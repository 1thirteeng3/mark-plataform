// deno-lint-ignore-file
// Schools Analytics - Performance Metrics
// Module 3: Data Intelligence (Dashboards)
// Returns performance analytics: top students, top rules, engagement metrics

// Shared helper to validate Admin tokens (Inlined for Manual Deployment)
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
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

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

        let targetSchoolId = role === 'SUPER_ADMIN'
            ? new URL(req.url).searchParams.get('schoolId') || schoolId
            : schoolId;

        // Fallback for Super Admin: If no specific school selected/assigned, grab the first one (Demo Mode)
        if (!targetSchoolId && role === 'SUPER_ADMIN') {
            const firstSchoolResponse = await fetch(
                `${supabaseUrl}/rest/v1/schools?select=id&limit=1`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                }
            );
            if (firstSchoolResponse.ok) {
                const schools = await firstSchoolResponse.json();
                if (schools.length > 0) {
                    targetSchoolId = schools[0].id;
                }
            }
        }

        if (!targetSchoolId) {
            return new Response(
                JSON.stringify({ error: 'Nenhuma escola encontrada para exibir dados.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

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

        // Get Class Performance (from new View)
        const classPerformanceResponse = await fetch(
            `${supabaseUrl}/rest/v1/analytics_class_performance?school_id=eq.${targetSchoolId}&order=engagement_score.desc`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        let classPerformance = [];
        let schoolOverview = {
            totalStudents: 0,
            activeStudents: 0,
            avgEngagement: 0
        };

        if (classPerformanceResponse.ok) {
            classPerformance = await classPerformanceResponse.json();

            // Calculate school-wide aggregates from class data
            if (classPerformance.length > 0) {
                const totalStudents = classPerformance.reduce((sum: number, c: any) => sum + c.total_students, 0);
                const activeStudents = classPerformance.reduce((sum: number, c: any) => sum + c.active_students, 0);
                const totalEngagement = classPerformance.reduce((sum: number, c: any) => sum + c.engagement_score, 0);

                schoolOverview = {
                    totalStudents,
                    activeStudents,
                    avgEngagement: parseFloat((totalEngagement / classPerformance.length).toFixed(2))
                };
            }
        }

        return new Response(
            JSON.stringify({
                schoolId: targetSchoolId,
                overview: schoolOverview,
                classPerformance: classPerformance.map((c: any) => ({
                    grade: c.grade,
                    totalStudents: c.total_students,
                    activeStudents: c.active_students,
                    engagementScore: c.engagement_score
                })),
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
