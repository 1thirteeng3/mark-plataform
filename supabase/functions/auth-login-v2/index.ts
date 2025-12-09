// Enhanced Authentication with PBKDF2
// Module 0: Core Hardening - Security-First Authentication
// Implements NIST-compliant PBKDF2 password hashing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 200 });
    }

    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: 'Email e senha são obrigatórios' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const jwtSecret = Deno.env.get('JWT_SECRET_V1') || 'mark-platform-secret-key-2024';

        // Fetch user from database
        const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${email}&select=*`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
            },
        });

        if (!userResponse.ok) {
            return new Response(
                JSON.stringify({ error: 'Erro ao buscar usuário' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        const users = await userResponse.json();

        if (users.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Credenciais inválidas' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const user = users[0];
        let authSuccessful = false;
        let requiresMigration = false;

        // AUTHENTICATION LOGIC
        if (user.password_salt) {
            // New PBKDF2 Auth
            authSuccessful = await verifyPasswordPBKDF2(password, user.password_hash, user.password_salt);
        } else {
            // Legacy Auth
            authSuccessful = (user.password_hash === `${password}_hash`);
            if (authSuccessful) {
                requiresMigration = true;
            }
        }

        if (!authSuccessful) {
            return new Response(
                JSON.stringify({ error: 'Credenciais inválidas' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        // MIGRATION LOGIC (Upgrade Security transparently)
        if (requiresMigration) {
            const salt = crypto.randomUUID(); // Good enough for salt
            const newHash = await hashPasswordPBKDF2(password, salt);

            // Background update (fire and forget fetch)
            await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    password_hash: newHash,
                    password_salt: salt,
                    updated_at: new Date().toISOString()
                })
            });
            console.log(`User ${user.id} migrated to PBKDF2`);
        }

        // Generate JWT token
        const header = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            schoolId: user.school_id,
            tokenVersion: user.token_version || 1, // Kill Switch
            iss: 'mark-platform',
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        };

        // Base64 encoding
        const base64Header = btoa(JSON.stringify(header));
        const base64Payload = btoa(JSON.stringify(payload));
        const signature = await createHmacSignature(`${base64Header}.${base64Payload}`, jwtSecret);
        const token = `${base64Header}.${base64Payload}.${signature}`;

        // Fetch student data if role is STUDENT
        let studentData = null;
        if (user.role === 'STUDENT') {
            const studentResponse = await fetch(
                `${supabaseUrl}/rest/v1/students?user_id=eq.${user.id}&select=*`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                }
            );

            if (studentResponse.ok) {
                const students = await studentResponse.json();
                if (students.length > 0) {
                    studentData = students[0];
                }
            }
        }

        // Fetch school data
        let schoolData = null;
        if (user.school_id) {
            const schoolResponse = await fetch(
                `${supabaseUrl}/rest/v1/schools?id=eq.${user.school_id}&select=*`,
                {
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                    },
                }
            );

            if (schoolResponse.ok) {
                const schools = await schoolResponse.json();
                if (schools.length > 0) {
                    schoolData = schools[0];
                }
            }
        }

        return new Response(
            JSON.stringify({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    schoolId: user.school_id,
                    school: schoolData,
                    student: studentData,
                    securityLevel: requiresMigration ? 'UPGRADED' : 'SECURE'
                },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Login error:', error);
        return new Response(
            JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

// Helper: HMAC Signature for JWT
async function createHmacSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const dataBuffer = encoder.encode(data);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Helper: PBKDF2 Hashing
// Iterations: 100,000 (NIST Recommendation)
// KeyLen: 64
// Algo: SHA-512
async function hashPasswordPBKDF2(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: "SHA-512",
        },
        keyMaterial,
        { name: "HMAC", hash: "SHA-512", length: 512 },
        true,
        ["sign", "verify"]
    );

    // Export key to raw bytes
    const exportedKey = await crypto.subtle.exportKey("raw", key);
    // Convert to Hex string for storage
    return Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPasswordPBKDF2(password: string, storedHash: string, salt: string): Promise<boolean> {
    const newHash = await hashPasswordPBKDF2(password, salt);
    return newHash === storedHash;
}
