/**
 * Shared Authentication Module
 * Uses jose library for robust JWT verification
 * 
 * @module _shared/auth
 */

import { jwtVerify, createRemoteJWKSet } from "https://deno.land/x/jose@v5.2.0/index.ts";

// Types
export interface TokenPayload {
    userId: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT';
    schoolId: string | null;
    exp: number;
    iat: number;
    iss: string;
}

export interface AuthResult {
    valid: boolean;
    payload?: TokenPayload;
    error?: string;
}

/**
 * Extract JWT token from Authorization header
 */
export function getJwtFromRequest(req: Request): string | null {
    const authHeader = req.headers.get('Authorization');

    // Support standard Authorization: Bearer <token>
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // Legacy support: x-user-token header (deprecated)
    const legacyToken = req.headers.get('x-user-token');
    if (legacyToken) {
        console.warn('[AUTH] Using deprecated x-user-token header. Please migrate to Authorization: Bearer <token>');
        return legacyToken;
    }

    return null;
}

/**
 * Verify JWT token using jose library
 * Supports both HS256 (legacy) and RS256 (JWKS) verification
 */
export async function verifySupabaseJwt(token: string): Promise<AuthResult> {
    try {
        const jwtSecret = Deno.env.get('JWT_SECRET');

        if (!jwtSecret) {
            console.error('[AUTH] JWT_SECRET environment variable not set');
            return { valid: false, error: 'Server configuration error' };
        }

        // Decode header to check algorithm
        const [headerB64] = token.split('.');
        const header = JSON.parse(atob(headerB64));

        let payload: TokenPayload;

        if (header.alg === 'HS256') {
            // Legacy HS256 verification
            const secret = new TextEncoder().encode(jwtSecret);
            const { payload: verified } = await jwtVerify(token, secret, {
                issuer: 'mark-platform',
            });

            payload = {
                userId: verified.userId as string,
                email: verified.email as string,
                role: verified.role as TokenPayload['role'],
                schoolId: (verified.schoolId as string) || null,
                exp: verified.exp as number,
                iat: verified.iat as number,
                iss: verified.iss as string,
            };
        } else if (header.alg === 'RS256') {
            // Supabase JWKS verification (recommended for production)
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            if (!supabaseUrl) {
                return { valid: false, error: 'SUPABASE_URL not configured' };
            }

            const JWKS = createRemoteJWKSet(
                new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
            );

            const { payload: verified } = await jwtVerify(token, JWKS, {
                issuer: `${supabaseUrl}/auth/v1`,
            });

            // Map Supabase claims to our format
            payload = {
                userId: verified.sub as string,
                email: verified.email as string,
                role: (verified.app_metadata as any)?.role || 'STUDENT',
                schoolId: (verified.app_metadata as any)?.school_id || null,
                exp: verified.exp as number,
                iat: verified.iat as number,
                iss: verified.iss as string,
            };
        } else {
            return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
        }

        return { valid: true, payload };

    } catch (error) {
        console.error('[AUTH] Token verification failed:', error.message);

        if (error.code === 'ERR_JWT_EXPIRED') {
            return { valid: false, error: 'Token expired' };
        }
        if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
            return { valid: false, error: 'Invalid signature' };
        }

        return { valid: false, error: 'Invalid token' };
    }
}

/**
 * Validate request and extract authenticated user
 * Returns 401 response if unauthorized
 */
export async function requireAuth(req: Request): Promise<{ payload: TokenPayload } | Response> {
    const token = getJwtFromRequest(req);

    if (!token) {
        return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const result = await verifySupabaseJwt(token);

    if (!result.valid || !result.payload) {
        return new Response(
            JSON.stringify({ error: result.error || 'Invalid token' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return { payload: result.payload };
}

/**
 * Check if user has required role(s)
 * Returns 403 response if forbidden
 */
export function requireRole(
    payload: TokenPayload,
    allowedRoles: TokenPayload['role'][]
): Response | null {
    if (!allowedRoles.includes(payload.role)) {
        return new Response(
            JSON.stringify({
                error: 'Forbidden',
                message: `Required role: ${allowedRoles.join(' or ')}`
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }
    return null;
}
