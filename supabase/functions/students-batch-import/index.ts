// deno-lint-ignore-file
// Batch Student Import
// Module 1: Student Management at Scale
// Allows bulk import of students via JSON/CSV

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
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // Validate student data
        const validStudents = [];
        const errors = [];

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const index = i + 1;

            // Required fields validation
            if (!student.name || typeof student.name !== 'string') {
                errors.push({ line: index, error: 'Nome completo é obrigatório' });
                continue;
            }

            if (!student.email || typeof student.email !== 'string') {
                errors.push({ line: index, error: 'Email é obrigatório' });
                continue;
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(student.email)) {
                errors.push({ line: index, error: 'Formato de email inválido' });
                continue;
            }

            // Check for duplicate emails in the batch
            const duplicateInBatch = validStudents.find(s => s.email === student.email);
            if (duplicateInBatch) {
                errors.push({ line: index, error: `Email duplicado na linha ${validStudents.indexOf(duplicateInBatch) + 1}` });
                continue;
            }

            validStudents.push({
                name: student.name.trim(),
                email: student.email.trim().toLowerCase(),
                guardianEmail: student.guardianEmail?.trim() || null,
                grade: student.grade?.trim() || null,
                enrollmentId: student.enrollmentId?.trim() || null,
            });
        }

        // Process valid students in batches of 100
        const batchSize = 100;
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < validStudents.length; i += batchSize) {
            const batch = validStudents.slice(i, i + batchSize);

            // Generate temporary passwords
            const usersToInsert = batch.map(student => ({
                school_id: schoolId,
                name: student.name,
                email: student.email,
                password_hash: `temp_${Math.random().toString(36).slice(2)}_hash`, // Temporary password
                role: 'STUDENT',
            }));

            // Insert users (skip duplicates)
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
                const errorText = await insertUsersResponse.text();
                console.error('Error inserting users:', errorText);
                continue;
            }

            const insertedUsers = await insertUsersResponse.json();

            // Create student records
            const studentsToInsert = insertedUsers.map((user: any, idx: number) => ({
                user_id: user.id,
                school_id: schoolId,
                marks_balance: 0,
                // New Fields
                grade: batch[idx].grade,
                guardian_email: batch[idx].guardianEmail,
                enrollment_id: batch[idx].enrollmentId,
            }));

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
            }

            skipCount = validStudents.length - successCount;
        }

        return new Response(
            JSON.stringify({
                success: true,
                summary: {
                    total: students.length,
                    imported: successCount,
                    skipped: skipCount,
                    errors: errors.length,
                },
                errors: errors,
                message: `${successCount} alunos importados com sucesso, ${skipCount} ignorados (duplicados), ${errors.length} erros`,
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
