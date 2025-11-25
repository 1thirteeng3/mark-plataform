// Expire Marks Cron Job
// Module 2: Economic Governance (Burn Policy)
// Automatically expires marks on annual basis (Dec 31st)
// Executes as a scheduled cron job

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 200 });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const cronSecret = Deno.env.get('CRON_SECRET') || 'mark-platform-cron-secret';

        // Verify cron secret to prevent unauthorized execution
        const authHeader = req.headers.get('authorization');
        if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized cron execution' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        // Get all schools
        const schoolsResponse = await fetch(`${supabaseUrl}/rest/v1/schools?select=id,name`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
            },
        });

        if (!schoolsResponse.ok) {
            throw new Error('Failed to fetch schools');
        }

        const schools = await schoolsResponse.json();

        const results = [];
        let totalMarksExpired = 0;
        let totalStudentsAffected = 0;

        // Process each school
        for (const school of schools) {
            // Call stored procedure to expire balances
            const expirationResponse = await fetch(
                `${supabaseUrl}/rest/v1/rpc/expire_school_balances`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        p_school_id: school.id,
                        p_expiration_date: new Date().toISOString().split('T')[0],
                    }),
                }
            );

            if (!expirationResponse.ok) {
                const errorText = await expirationResponse.text();
                results.push({
                    schoolId: school.id,
                    schoolName: school.name,
                    status: 'ERROR',
                    error: errorText,
                });
                continue;
            }

            const expirationResult = await expirationResponse.json();

            if (expirationResult.status === 'SUCCESS') {
                totalMarksExpired += expirationResult.totalMarksExpired || 0;
                totalStudentsAffected += expirationResult.studentsAffected || 0;

                results.push({
                    schoolId: school.id,
                    schoolName: school.name,
                    status: 'SUCCESS',
                    marksExpired: expirationResult.totalMarksExpired,
                    studentsAffected: expirationResult.studentsAffected,
                });

                // TODO: Send email notification to school admin
                // For now, just log the report
                console.log(`[DEFLATION REPORT] ${school.name}:`, {
                    marksExpired: expirationResult.totalMarksExpired,
                    studentsAffected: expirationResult.studentsAffected,
                });
            } else {
                results.push({
                    schoolId: school.id,
                    schoolName: school.name,
                    status: 'ERROR',
                    error: expirationResult.message,
                });
            }
        }

        // Refresh analytics materialized view after expiration
        const refreshResponse = await fetch(
            `${supabaseUrl}/rest/v1/rpc/refresh_analytics`,
            {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const analyticsRefreshed = refreshResponse.ok;

        return new Response(
            JSON.stringify({
                success: true,
                executionTime: new Date().toISOString(),
                summary: {
                    totalSchools: schools.length,
                    totalMarksExpired,
                    totalStudentsAffected,
                    analyticsRefreshed,
                },
                results,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Cron job error:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Erro ao executar expiração de marks',
                details: error.message,
                timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
