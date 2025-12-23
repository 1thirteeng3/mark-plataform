/**
 * Shared CORS Configuration
 * Centralized CORS headers for all Edge Functions
 * 
 * @module _shared/cors
 */

// Production domains
const ALLOWED_ORIGINS = [
    'https://www.markedu.tech',
    'https://markedu.tech',
    'http://localhost:5173', // Local development
    'http://localhost:3000', // Alternative local port
];

/**
 * Standard CORS headers for API responses
 */
export const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://www.markedu.tech',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
};

/**
 * Get CORS headers with dynamic origin validation
 * @param req - The incoming request to check Origin header
 */
export function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get('Origin');

    // Validate origin against whitelist
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return {
            ...corsHeaders,
            'Access-Control-Allow-Origin': origin,
        };
    }

    // Default to production domain
    return corsHeaders;
}

/**
 * Handle CORS preflight (OPTIONS) request
 * @param req - The incoming request
 * @returns Response for preflight or null if not OPTIONS
 */
export function handleCors(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: getCorsHeaders(req),
        });
    }
    return null;
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(
    data: unknown,
    req: Request,
    status: number = 200
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...getCorsHeaders(req),
            'Content-Type': 'application/json',
        },
    });
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(
    message: string,
    req: Request,
    status: number = 500
): Response {
    return new Response(
        JSON.stringify({ error: message }),
        {
            status,
            headers: {
                ...getCorsHeaders(req),
                'Content-Type': 'application/json',
            },
        }
    );
}
