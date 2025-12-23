/**
 * POST /auth-login-v2
 * Enhanced Authentication with PBKDF2 password hashing
 * Supports transparent migration from legacy passwords
 * 
 * Body: { email, password }
 * Response: { token, user }
 */

import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAdminHeaders, getRestUrl } from "../_shared/supabaseAdmin.ts";

// PBKDF2 Helpers
async function hashPasswordPBKDF2(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-512" }, keyMaterial, { name: "HMAC", hash: "SHA-512", length: 512 }, true, ["sign", "verify"]);
    const exported = await crypto.subtle.exportKey("raw", key);
    return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPasswordPBKDF2(password: string, storedHash: string, salt: string): Promise<boolean> {
    return await hashPasswordPBKDF2(password, salt) === storedHash;
}

Deno.serve(async (req) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const { email, password } = await req.json();
        if (!email || !password) return errorResponse('Email e senha são obrigatórios', req, 400);

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Fetch user
        const userRes = await fetch(`${restUrl}/users?email=eq.${email}&select=*`, { headers });
        if (!userRes.ok) throw new Error('Erro ao buscar usuário');
        const users = await userRes.json();
        if (users.length === 0) return errorResponse('Credenciais inválidas', req, 401);

        const user = users[0];
        let authSuccessful = false, requiresMigration = false;

        // Auth logic
        if (user.password_salt) {
            authSuccessful = await verifyPasswordPBKDF2(password, user.password_hash, user.password_salt);
        } else {
            authSuccessful = user.password_hash === `${password}_hash`;
            if (authSuccessful) requiresMigration = true;
        }

        if (!authSuccessful) return errorResponse('Credenciais inválidas', req, 401);

        // Migrate legacy password
        if (requiresMigration) {
            const salt = crypto.randomUUID();
            const newHash = await hashPasswordPBKDF2(password, salt);
            fetch(`${restUrl}/users?id=eq.${user.id}`, { method: 'PATCH', headers, body: JSON.stringify({ password_hash: newHash, password_salt: salt, updated_at: new Date().toISOString() }) }).catch(() => { });
            console.log(`User ${user.id} migrated to PBKDF2`);
        }

        // Generate JWT
        const jwtSecret = Deno.env.get('JWT_SECRET');
        if (!jwtSecret) throw new Error('JWT_SECRET not configured');
        const secret = new TextEncoder().encode(jwtSecret);

        const token = await new SignJWT({ userId: user.id, email: user.email, role: user.role, schoolId: user.school_id, tokenVersion: user.token_version || 1 })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('mark-platform')
            .setExpirationTime('24h')
            .sign(secret);

        // Fetch additional data
        const [studentRes, schoolRes] = await Promise.all([
            user.role === 'STUDENT' ? fetch(`${restUrl}/students?user_id=eq.${user.id}&select=*`, { headers }) : Promise.resolve(null),
            user.school_id ? fetch(`${restUrl}/schools?id=eq.${user.school_id}&select=*`, { headers }) : Promise.resolve(null),
        ]);

        const studentData = studentRes ? (await studentRes.json())[0] || null : null;
        const schoolData = schoolRes ? (await schoolRes.json())[0] || null : null;

        return jsonResponse({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, schoolId: user.school_id, school: schoolData, student: studentData, securityLevel: requiresMigration ? 'UPGRADED' : 'SECURE' },
        }, req);

    } catch (error) {
        console.error('[auth-login-v2] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
