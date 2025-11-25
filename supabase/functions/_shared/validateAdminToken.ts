// Shared helper to validate Admin tokens
export async function validateAdminToken(token: string): Promise<{
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
        // Split JWT token
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { valid: false };
        }

        const [headerB64, payloadB64, signatureB64] = parts;

        // Decode payload
        const payload = JSON.parse(atob(payloadB64));

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return { valid: false };
        }

        // Verify signature
        const jwtSecret = Deno.env.get('JWT_SECRET_V1') || 'mark-platform-secret-key-2024';
        const expectedSignature = await createHmacSignature(`${headerB64}.${payloadB64}`, jwtSecret);

        if (expectedSignature !== signatureB64) {
            // Try V2 secret (for key rotation)
            const jwtSecretV2 = Deno.env.get('JWT_SECRET_V2');
            if (jwtSecretV2) {
                const expectedSignatureV2 = await createHmacSignature(`${headerB64}.${payloadB64}`, jwtSecretV2);
                if (expectedSignatureV2 !== signatureB64) {
                    return { valid: false };
                }
            } else {
                return { valid: false };
            }
        }

        // Check if issuer is correct
        if (payload.iss !== 'mark-platform') {
            return { valid: false };
        }

        return {
            valid: true,
            payload: {
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
                schoolId: payload.schoolId,
                exp: payload.exp,
            },
        };

    } catch (error) {
        console.error('Token validation error:', error);
        return { valid: false };
    }
}

// Helper function to create HMAC signature
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
