// deno-lint-ignore-file
// Schools Analytics - Financial Metrics
// Module 3: Data Intelligence (Dashboards)
// Returns financial analytics: burn rate, circulating marks, liability

// SHARED HELPER: Inlined for manual deployment compatibility
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
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 200 });
    }

    try {
        // Validate admin token
        const authHeader = req.headers.get('x-user-token') || req.headers.get('authorization');
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

        // If targetSchoolId is present, we fetch specific school data
        if (targetSchoolId) {
            // Get financial summary for specific school
            const summaryResponse = await fetch(
                `${supabaseUrl}/rest/v1/school_financial_summary?school_id=eq.${targetSchoolId}`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                }
            );

            if (!summaryResponse.ok) throw new Error('Failed to fetch financial summary');

            const summaries = await summaryResponse.json();
            const summary = summaries.length > 0 ? summaries[0] : {
                total_circulating_marks: 0,
                total_students: 0,
                students_with_balance: 0,
            };

            // Get 30-day analytics for specific school
            const analyticsResponse = await fetch(
                `${supabaseUrl}/rest/v1/analytics_school_engagement?school_id=eq.${targetSchoolId}&order=ref_date.desc&limit=30`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                }
            );

            if (!analyticsResponse.ok) throw new Error('Failed to fetch analytics');
            const analytics = await analyticsResponse.json();

            // Calculate burn rate and velocity (same as before)
            const totalMinted = analytics.reduce((sum: number, day: any) => sum + (day.total_minted || 0), 0);
            const totalRedeemed = analytics.reduce((sum: number, day: any) => sum + (day.total_redeemed || 0), 0);
            const totalExpired = analytics.reduce((sum: number, day: any) => sum + (day.total_expired || 0), 0);
            const burnRate = totalMinted > 0
                ? ((totalRedeemed + totalExpired) / totalMinted * 100).toFixed(2)
                : '0.00';

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

        } else if (role === 'SUPER_ADMIN') {
            // GLOBAL MODE: No school selected, aggregate EVERYTHING

            // 1. Fetch ALL school summaries
            const summaryResponse = await fetch(
                `${supabaseUrl}/rest/v1/school_financial_summary`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                }
            );
            if (!summaryResponse.ok) throw new Error('Failed to fetch global summary');
            const allSummaries = await summaryResponse.json();

            const globalSummary = allSummaries.reduce((acc: any, curr: any) => ({
                total_circulating_marks: acc.total_circulating_marks + (curr.total_circulating_marks || 0),
                total_students: acc.total_students + (curr.total_students || 0),
                students_with_balance: acc.students_with_balance + (curr.students_with_balance || 0),
            }), { total_circulating_marks: 0, total_students: 0, students_with_balance: 0 });

            // 2. Fetch ALL analytics for last 30 days
            // Note: This could be heavy. Ideally we'd use a DB view for global aggregation.
            // For now, we fetch ordered by date descending.
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

            const analyticsResponse = await fetch(
                `${supabaseUrl}/rest/v1/analytics_school_engagement?ref_date=gte.${dateStr}&order=ref_date.desc`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                }
            );
            if (!analyticsResponse.ok) throw new Error('Failed to fetch global analytics');
            const allAnalytics = await analyticsResponse.json();

            // Group by date
            const groupedAnalytics: Record<string, any> = {};
            allAnalytics.forEach((day: any) => {
                const date = day.ref_date;
                if (!groupedAnalytics[date]) {
                    groupedAnalytics[date] = {
                        active_students: 0,
                        total_minted: 0,
                        total_redeemed: 0,
                        total_expired: 0,
                        ref_date: date,
                        count: 0
                    };
                }
                groupedAnalytics[date].active_students += (day.active_students || 0);
                groupedAnalytics[date].total_minted += (day.total_minted || 0);
                groupedAnalytics[date].total_redeemed += (day.total_redeemed || 0);
                groupedAnalytics[date].total_expired += (day.total_expired || 0);
                groupedAnalytics[date].count += 1;
            });

            // Convert back to array and slice 30
            const analyticsTimeline = Object.values(groupedAnalytics)
                .sort((a: any, b: any) => new Date(b.ref_date).getTime() - new Date(a.ref_date).getTime())
                .slice(0, 30);

            // Calculate global metrics
            const totalMinted = analyticsTimeline.reduce((sum: number, day: any) => sum + day.total_minted, 0);
            const totalRedeemed = analyticsTimeline.reduce((sum: number, day: any) => sum + day.total_redeemed, 0);
            const totalExpired = analyticsTimeline.reduce((sum: number, day: any) => sum + day.total_expired, 0);

            const burnRate = totalMinted > 0
                ? ((totalRedeemed + totalExpired) / totalMinted * 100).toFixed(2)
                : '0.00';

            // Global Velocity? Average active students per day across platform
            const avgActiveStudents = analyticsTimeline.length > 0
                ? analyticsTimeline.reduce((sum: number, day: any) => sum + day.active_students, 0) / analyticsTimeline.length
                : 0;

            const velocity = avgActiveStudents > 0
                ? (totalMinted / avgActiveStudents / 30).toFixed(2)
                : '0.00';

            return new Response(
                JSON.stringify({
                    schoolId: 'GLOBAL',
                    period: '30 days',
                    financial: {
                        circulatingMarks: globalSummary.total_circulating_marks,
                        totalStudents: globalSummary.total_students,
                        studentsWithBalance: globalSummary.students_with_balance,
                        liability: globalSummary.total_circulating_marks,
                    },
                    metrics: {
                        totalMinted,
                        totalRedeemed,
                        totalExpired,
                        burnRate: parseFloat(burnRate),
                        velocity: parseFloat(velocity),
                    },
                    timeline: analyticsTimeline.map((day: any) => ({
                        date: day.ref_date,
                        activeStudents: day.active_students,
                        minted: day.total_minted,
                        redeemed: day.total_redeemed,
                        expired: day.total_expired,
                    })),
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );

        } else {
            // ADMIN without schoolId? Should not happen if they are assigned.
            // Or SUPER_ADMIN who fell through?
            return new Response(
                JSON.stringify({ error: 'Nenhuma escola encontrada para exibir dados.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

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
