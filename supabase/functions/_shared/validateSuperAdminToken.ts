// Shared utility for validating SUPER_ADMIN JWT tokens
export function validateSuperAdminToken(req: Request): { userId: string; role: string; schoolId: string | null } {
    const token = req.headers.get('x-user-token');
    
    if (!token) {
        throw new Error('No authentication token provided');
    }

    // Extract payload from simple JWT (format: Bearer.base64payload)
    const parts = token.split('.');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new Error('Invalid token format');
    }

    try {
        const payload = JSON.parse(atob(parts[1]));
        
        // Validate token expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            throw new Error('Token expired');
        }

        // Validate SUPER_ADMIN role
        if (payload.role !== 'SUPER_ADMIN') {
            throw new Error('Insufficient permissions - SUPER_ADMIN access required');
        }

        return {
            userId: payload.userId,
            role: payload.role,
            schoolId: payload.schoolId || null
        };
    } catch (error) {
        throw new Error('Invalid token');
    }
}
