/**
 * POST /students-batch-import
 * Batch Student Import & Auto-Award Engine
 * 
 * Required Role: ADMIN
 * Body: { students: [{ name, email, grade?, enrollmentId?, ... }] }
 * Response: { success, summary, errors, message }
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

        const roleError = requireRole(payload, ['ADMIN']);
        if (roleError) return roleError;

        const { schoolId, userId: adminId } = payload;
        const { students } = await req.json();

        if (!students || !Array.isArray(students) || students.length === 0) {
            return errorResponse('Lista de alunos inválida ou vazia', req, 400);
        }

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // 1. Fetch Auto-Award Rules
        let activeRules: any[] = [];
        try {
            const rulesRes = await fetch(`${restUrl}/school_rules?school_id=eq.${schoolId}&criteria_field=not.is.null`, { headers });
            if (rulesRes.ok) activeRules = await rulesRes.json();
        } catch (e) { console.error('Failed to fetch rules', e); }

        // 2. Create Batch Record
        let batchId = null;
        try {
            const batchRes = await fetch(`${restUrl}/import_batches`, {
                method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
                body: JSON.stringify({ school_id: schoolId, admin_id: adminId, total_records: students.length, status: 'PROCESSING', filename: `batch_${new Date().toISOString()}.json` }),
            });
            if (batchRes.ok) batchId = (await batchRes.json())[0]?.id;
        } catch (e) { console.error('Failed to create batch', e); }

        // 3. Validate students
        const validStudents: any[] = [];
        const errors: any[] = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        students.forEach((s, i) => {
            const idx = i + 1;
            if (!s.name || typeof s.name !== 'string') { errors.push({ line: idx, error: 'Nome obrigatório' }); return; }
            if (!s.email || !emailRegex.test(s.email)) { errors.push({ line: idx, error: 'Email inválido' }); return; }
            if (validStudents.find(v => v.normalized.email === s.email.toLowerCase())) { errors.push({ line: idx, error: 'Email duplicado' }); return; }
            validStudents.push({ ...s, normalized: { name: s.name.trim(), email: s.email.toLowerCase(), grade: s.grade?.trim() || null, enrollmentId: s.enrollmentId?.trim() || null } });
        });

        // 4. Process in batches
        const BATCH_SIZE = 100;
        let successCount = 0, autoAwardsCount = 0, totalMarksDistributed = 0;

        for (let i = 0; i < validStudents.length; i += BATCH_SIZE) {
            const batch = validStudents.slice(i, i + BATCH_SIZE);

            // Insert users
            const usersToInsert = batch.map(s => ({ school_id: schoolId, name: s.normalized.name, email: s.normalized.email, password_hash: `temp_${Math.random().toString(36).slice(2)}_hash`, role: 'STUDENT' }));
            const usersRes = await fetch(`${restUrl}/users`, { method: 'POST', headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(usersToInsert) });
            if (!usersRes.ok) continue;
            const insertedUsers = await usersRes.json();

            // Insert students with auto-award calculation
            const studentsToInsert = insertedUsers.map((u: any, idx: number) => {
                const raw = batch[idx];
                let balance = 0;
                activeRules.forEach((rule: any) => {
                    if (rule.target_grade && rule.target_grade.toLowerCase() !== (raw.normalized.grade || '').toLowerCase()) return;
                    const val = raw[rule.criteria_field];
                    if (val == null) return;
                    const op = rule.criteria_operator, target = rule.criteria_value;
                    let match = false;
                    if (op === '>=') match = Number(val) >= Number(target);
                    else if (op === '>') match = Number(val) > Number(target);
                    else if (op === '<=') match = Number(val) <= Number(target);
                    else if (op === '<') match = Number(val) < Number(target);
                    else if (op === '=') match = String(val) === String(target);
                    if (match) { balance += rule.marks_to_award; autoAwardsCount++; totalMarksDistributed += rule.marks_to_award; }
                });
                return { user_id: u.id, school_id: schoolId, marks_balance: balance, grade: raw.normalized.grade, enrollment_id: raw.normalized.enrollmentId };
            });

            const studentsRes = await fetch(`${restUrl}/students`, { method: 'POST', headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(studentsToInsert) });
            if (studentsRes.ok) {
                const inserted = await studentsRes.json();
                successCount += inserted.length;
                // Create ledger entries for auto-awarded marks
                const ledgerEntries = inserted.filter((s: any) => s.marks_balance > 0).map((s: any) => ({ student_id: s.id, type: 'CREDIT', amount: s.marks_balance, description: 'Premiação Automática (Importação)' }));
                if (ledgerEntries.length) fetch(`${restUrl}/ledger_transactions`, { method: 'POST', headers, body: JSON.stringify(ledgerEntries) }).catch(() => { });
            }
        }

        // Update batch status
        if (batchId) fetch(`${restUrl}/import_batches?id=eq.${batchId}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'COMPLETED', processed_records: successCount }) }).catch(() => { });

        return jsonResponse({
            success: true,
            summary: { total: students.length, imported: successCount, skipped: validStudents.length - successCount, errors: errors.length, automation: { awards_triggered: autoAwardsCount, total_marks: totalMarksDistributed } },
            errors,
            message: `${successCount} alunos importados. ${autoAwardsCount} regras automáticas aplicadas (${totalMarksDistributed} pontos).`,
        }, req);

    } catch (error) {
        console.error('[students-batch-import] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
