// deno-lint-ignore-file
// Batch Student Import & Auto-Award Engine
// Module 1: Student Management at Scale
// Feature: Flexible Data Warehouse & Automations

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
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        const { schoolId, role, userId: adminId } = validation.payload;

        // Only ADMIN can import students for their school
        if (role !== 'ADMIN') {
            return new Response(
                JSON.stringify({ error: 'Apenas administradores podem importar alunos' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            );
        }

        const { students } = await req.json();

        if (!students || !Array.isArray(students) || students.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Lista de alunos inválida ou vazia' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // 1. Fetch Auto-Award Rules (Optimization: fetch once)
        let activeRules = [];
        try {
            const rulesResponse = await fetch(`${supabaseUrl}/rest/v1/school_rules?school_id=eq.${schoolId}&criteria_field=not.is.null`, {
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
            });
            if (rulesResponse.ok) {
                activeRules = await rulesResponse.json();
            }
        } catch (e) {
            console.error('Failed to fetch rules', e);
        }

        // 2. Create Batch Record (Warehouse)
        let batchId = null;
        try {
            const batchResponse = await fetch(`${supabaseUrl}/rest/v1/import_batches`, {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    school_id: schoolId,
                    admin_id: adminId,
                    total_records: students.length,
                    status: 'PROCESSING',
                    filename: `batch_${new Date().toISOString()}.json`
                })
            });
            if (batchResponse.ok) {
                const batch = await batchResponse.json();
                batchId = batch[0].id;
            }
        } catch (e) {
            console.error('Failed to create batch record', e);
        }

        // 3. Process Students
        const validStudents = [];
        const recordsToInsert = []; // For Warehouse
        const errors = [];
        let autoAwardsCount = 0;
        let totalMarksDistributed = 0;

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const index = i + 1;

            // Prepare Warehouse Record (Raw Data)
            if (batchId) {
                recordsToInsert.push({
                    batch_id: batchId,
                    student_email: student.email,
                    enrollment_id: student.enrollmentId,
                    raw_data: student, // Store everything!
                    processing_status: 'PENDING'
                });
            }

            // Normal Validation
            if (!student.name || typeof student.name !== 'string') {
                errors.push({ line: index, error: 'Nome completo é obrigatório' });
                continue;
            }
            if (!student.email || typeof student.email !== 'string') {
                errors.push({ line: index, error: 'Email é obrigatório' });
                continue;
            }
            // Basic Email Regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(student.email)) {
                errors.push({ line: index, error: 'Formato de email inválido' });
                continue;
            }

            const duplicateInBatch = validStudents.find(s => s.email === student.email);
            if (duplicateInBatch) {
                errors.push({ line: index, error: `Email duplicado na linha ${validStudents.indexOf(duplicateInBatch) + 1}` });
                continue;
            }

            validStudents.push({
                ...student, // Keep all props for rule engine
                normalized: {
                    name: student.name.trim(),
                    email: student.email.trim().toLowerCase(),
                    guardianEmail: student.guardianEmail?.trim() || null,
                    grade: student.grade?.trim() || null,
                    enrollmentId: student.enrollmentId?.trim() || null,
                }
            });
        }

        // Batch Insert Warehouse Records (Async, don't block)
        if (recordsToInsert.length > 0) {
            fetch(`${supabaseUrl}/rest/v1/import_records`, {
                method: 'POST',
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(recordsToInsert)
            }).catch(e => console.error('Warehouse insert failed', e));
        }

        // Process valid students in chunks
        const batchSize = 100;
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < validStudents.length; i += batchSize) {
            const batch = validStudents.slice(i, i + batchSize);

            // 1. Create Users
            const usersToInsert = batch.map(s => ({
                school_id: schoolId,
                name: s.normalized.name,
                email: s.normalized.email,
                password_hash: `temp_${Math.random().toString(36).slice(2)}_hash`,
                role: 'STUDENT',
            }));

            const insertUsersResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=ignore-duplicates,return=representation',
                },
                body: JSON.stringify(usersToInsert),
            });

            if (!insertUsersResponse.ok) {
                console.error('Error inserting users:', await insertUsersResponse.text());
                continue;
            }

            const insertedUsers = await insertUsersResponse.json();

            // 2. Create Students & Calculate Initial Balance (Auto-Award)
            const studentsToInsert = insertedUsers.map((user: any, idx: number) => {
                const rawStudent = batch[idx]; // Contains raw data for rules
                let initialBalance = 0;

                // --- RULE ENGINE EXECUTION ---
                // Iterate active rules to find matches
                activeRules.forEach((rule: any) => {
                    // 1. Check Grade Target (if defined)
                    if (rule.target_grade) {
                        const ruleGrade = rule.target_grade.trim().toLowerCase();
                        const studentGrade = (rawStudent.normalized.grade || '').trim().toLowerCase();
                        if (ruleGrade !== studentGrade) return;
                    }

                    const field = rule.criteria_field;
                    const op = rule.criteria_operator;
                    const value = rule.criteria_value;
                    const studentValue = rawStudent[field]; // Access raw JSON property

                    let isMatch = false;

                    if (studentValue !== undefined && studentValue !== null) {
                        // Simple Comparison Logic
                        if (op === '>=') isMatch = Number(studentValue) >= Number(value);
                        else if (op === '>') isMatch = Number(studentValue) > Number(value);
                        else if (op === '<=') isMatch = Number(studentValue) <= Number(value);
                        else if (op === '<') isMatch = Number(studentValue) < Number(value);
                        else if (op === '=') isMatch = String(studentValue) === String(value);
                        // Add more operators as needed
                    }

                    if (isMatch) {
                        initialBalance += rule.marks_to_award;
                        autoAwardsCount++;
                        totalMarksDistributed += rule.marks_to_award;

                        // FUTURE: Create detailed ledger entries for each rule
                        // For MVP: We just set the initial balance high
                    }
                });
                // -----------------------------

                return {
                    user_id: user.id,
                    school_id: schoolId,
                    marks_balance: initialBalance, // Set calculated balance
                    grade: rawStudent.normalized.grade,
                    guardian_email: rawStudent.normalized.guardianEmail,
                    enrollment_id: rawStudent.normalized.enrollmentId,
                };
            });

            if (studentsToInsert.length > 0) {
                const insertStudentsResponse = await fetch(`${supabaseUrl}/rest/v1/students`, {
                    method: 'POST',
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=ignore-duplicates,return=representation',
                    },
                    body: JSON.stringify(studentsToInsert),
                });

                if (insertStudentsResponse.ok) {
                    const insertedStudents = await insertStudentsResponse.json();
                    successCount += insertedStudents.length;

                    // Creates Ledger Entries for the Initial Balances (if > 0)
                    const ledgerEntries = insertedStudents
                        .filter((s: any) => s.marks_balance > 0)
                        .map((s: any) => ({
                            student_id: s.id,
                            type: 'CREDIT',
                            amount: s.marks_balance,
                            description: 'Premiação Automática (Importação)',
                            created_at: new Date().toISOString()
                        }));

                    if (ledgerEntries.length > 0) {
                        fetch(`${supabaseUrl}/rest/v1/ledger_transactions`, {
                            method: 'POST',
                            headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(ledgerEntries)
                        }).catch(e => console.error('Ledger insert failed', e));
                    }
                }
            } else {
                // All users were duplicates
                skipCount += batch.length;
            }

            // Calculate skips properly based on what wasn't inserted
            skipCount = validStudents.length - successCount;
        }

        // Update Batch Status
        if (batchId) {
            fetch(`${supabaseUrl}/rest/v1/import_batches?id=eq.${batchId}`, {
                method: 'PATCH',
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'COMPLETED',
                    processed_records: successCount
                })
            }).catch(e => console.error('Batch status update failed', e));
        }

        return new Response(
            JSON.stringify({
                success: true,
                summary: {
                    total: students.length,
                    imported: successCount,
                    skipped: skipCount,
                    errors: errors.length,
                    automation: {
                        awards_triggered: autoAwardsCount,
                        total_marks: totalMarksDistributed
                    }
                },
                errors: errors,
                message: `${successCount} alunos importados. ${autoAwardsCount} regras automáticas aplicadas (${totalMarksDistributed} pontos distribuídos).`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Batch import error:', error);
        return new Response(
            JSON.stringify({
                error: 'Erro ao processar importação',
                details: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
