/**
 * POST /auth-login
 * Authenticate user and return JWT token
 * 
 * Body: { email: string, password: string }
 * Response: { token: string, user: { id, name, email, role, schoolId } }
 */

import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAdminHeaders, getRestUrl } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return errorResponse('Email and password are required', req, 400);
        }

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Query user by email
        const userResponse = await fetch(
            `${restUrl}/users?email=eq.${encodeURIComponent(email)}`,
            { headers }
        );

        if (!userResponse.ok) {
            throw new Error('Database query failed');
        }

        const users = await userResponse.json();

        if (!users || users.length === 0) {
            return errorResponse('Invalid email or password', req, 401);
        }

        const user = users[0];

        // TODO: In production, verify password hash using bcrypt
        // For demo, we skip actual password verification
        // const isValid = await bcrypt.compare(password, user.password_hash);

        // Get JWT secret
        const jwtSecret = Deno.env.get('JWT_SECRET');
        if (!jwtSecret) {
            console.error('[auth-login] JWT_SECRET not configured');
            throw new Error('Server configuration error');
        }

        // Create JWT token using jose library
        const secret = new TextEncoder().encode(jwtSecret);

        const token = await new SignJWT({
            userId: user.id,
            email: user.email,
            role: user.role,
            schoolId: user.school_id,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('mark-platform')
            .setExpirationTime('24h')
            .sign(secret);

        return jsonResponse({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.school_id,
            },
        }, req);

    } catch (error) {
        console.error('[auth-login] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});
