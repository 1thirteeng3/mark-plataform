// GET /student-redemptions
// Get student's voucher redemption history
// Response: [{ id, voucherName, voucherCode, marksCost, redeemedAt, status }]

function validateStudentToken(req: Request): { userId: string; role: string; schoolId: string | null } {
    const token = req.headers.get('x-user-token');
    if (!token) throw new Error('No authentication token provided');
    const parts = token.split('.');
    if (parts.length !== 2 || parts[0] !== 'Bearer') throw new Error('Invalid token format');
    try {
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) throw new Error('Token expired');
        if (payload.role !== 'STUDENT') throw new Error('Insufficient permissions - STUDENT access required');
        return { userId: payload.userId, role: payload.role, schoolId: payload.schoolId || null };
    } catch (error) {
        throw new Error('Invalid token');
    }
}

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Validate STUDENT token
        const { userId } = validateStudentToken(req);

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        const headers = {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        };

        // Get student ID from user ID
        const studentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?user_id=eq.${userId}&select=id`,
            { headers }
        );

        if (!studentsResponse.ok) {
            throw new Error('Failed to fetch student data');
        }

        const students = await studentsResponse.json();
        if (!students || students.length === 0) {
            throw new Error('Student record not found');
        }

        const studentId = students[0].id;

        // Fetch redemptions with voucher details
        const redemptionsResponse = await fetch(
            `${supabaseUrl}/rest/v1/redeemed_vouchers?student_id=eq.${studentId}&select=id,voucher_code,status,created_at,voucher_catalog!inner(name,marks_cost)&order=created_at.desc`,
            { headers }
        );

        if (!redemptionsResponse.ok) {
            throw new Error('Failed to fetch redemptions');
        }

        const redemptions = await redemptionsResponse.json();

        // Transform to camelCase
        const formattedRedemptions = redemptions.map((redemption: any) => ({
            id: redemption.id,
            voucherName: redemption.voucher_catalog.name,
            voucherCode: redemption.voucher_code,
            marksCost: redemption.voucher_catalog.marks_cost,
            redeemedAt: redemption.created_at,
            status: redemption.status
        }));

        return new Response(JSON.stringify(formattedRedemptions), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Student redemptions error:', error);

        const errorResponse = {
            error: {
                code: 'REDEMPTIONS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: error.message.includes('permissions') ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
