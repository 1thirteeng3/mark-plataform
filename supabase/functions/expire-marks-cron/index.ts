/**
 * POST /expire-marks-cron
 * Expire Marks Cron Job - Annual Economic Governance
 * Requires CRON_SECRET for authentication
 * 
 * Response: { success, summary, results }
 */

import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAdminHeaders, getRestUrl } from "../_shared/supabaseAdmin.ts";

// Mock Email Service
async function sendEmail(to: string, subject: string, html: string) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
}

Deno.serve(async (req) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const cronSecret = Deno.env.get('CRON_SECRET') || 'mark-platform-cron-secret';
        const authHeader = req.headers.get('authorization');

        if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
            return errorResponse('Unauthorized cron execution', req, 401);
        }

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Get all schools
        const schoolsRes = await fetch(`${restUrl}/schools?select=id,name`, { headers });
        if (!schoolsRes.ok) throw new Error('Failed to fetch schools');
        const schools = await schoolsRes.json();

        const results: any[] = [];
        let totalMarksExpired = 0, totalStudentsAffected = 0;

        // Process each school
        for (const school of schools) {
            const expirationRes = await fetch(`${restUrl}/rpc/expire_school_balances`, {
                method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_school_id: school.id, p_expiration_date: new Date().toISOString().split('T')[0] }),
            });

            if (!expirationRes.ok) {
                results.push({ schoolId: school.id, schoolName: school.name, status: 'ERROR', error: await expirationRes.text() });
                continue;
            }

            const result = await expirationRes.json();
            if (result.status === 'SUCCESS') {
                totalMarksExpired += result.totalMarksExpired || 0;
                totalStudentsAffected += result.studentsAffected || 0;
                results.push({ schoolId: school.id, schoolName: school.name, status: 'SUCCESS', marksExpired: result.totalMarksExpired, studentsAffected: result.studentsAffected });

                await sendEmail('admin@mark.com', `Relatório de Expiração: ${school.name}`, `
          <h1>Expiração Anual - ${school.name}</h1>
          <p>Marcas Expiradas: ${result.totalMarksExpired}</p>
          <p>Alunos Afetados: ${result.studentsAffected}</p>
        `);
            } else {
                results.push({ schoolId: school.id, schoolName: school.name, status: 'ERROR', error: result.message });
            }
        }

        // Refresh analytics
        const refreshRes = await fetch(`${restUrl}/rpc/refresh_analytics`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' } });

        return jsonResponse({
            success: true,
            executionTime: new Date().toISOString(),
            summary: { totalSchools: schools.length, totalMarksExpired, totalStudentsAffected, analyticsRefreshed: refreshRes.ok },
            results,
        }, req);

    } catch (error) {
        console.error('[expire-marks-cron] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
