// GET /platform-stats
// Get global platform statistics
// Response: { totalSchools, totalStudents, totalTransactions, totalMarksInCirculation }

function validateSuperAdminToken(req: Request): { userId: string; role: string; schoolId: string | null } {
    const token = req.headers.get('x-user-token');
    if (!token) throw new Error('No authentication token provided');
    const parts = token.split('.');
    if (parts.length !== 2 || parts[0] !== 'Bearer') throw new Error('Invalid token format');
    try {
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) throw new Error('Token expired');
        if (payload.role !== 'SUPER_ADMIN') throw new Error('Insufficient permissions - SUPER_ADMIN access required');
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
        // Validate SUPER_ADMIN token
        validateSuperAdminToken(req);

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

        // Get total schools
        const schoolsResponse = await fetch(`${supabaseUrl}/rest/v1/schools?select=count`, {
            headers: { ...headers, 'Prefer': 'count=exact' }
        });
        const schoolsCount = parseInt(schoolsResponse.headers.get('content-range')?.split('/')[1] || '0');

        // Get total students
        const studentsResponse = await fetch(`${supabaseUrl}/rest/v1/students?select=count`, {
            headers: { ...headers, 'Prefer': 'count=exact' }
        });
        const studentsCount = parseInt(studentsResponse.headers.get('content-range')?.split('/')[1] || '0');

        // Get total transactions
        const transactionsResponse = await fetch(`${supabaseUrl}/rest/v1/ledger_transactions?select=count`, {
            headers: { ...headers, 'Prefer': 'count=exact' }
        });
        const transactionsCount = parseInt(transactionsResponse.headers.get('content-range')?.split('/')[1] || '0');

        // Get total marks in circulation (sum of all student balances)
        const balancesResponse = await fetch(`${supabaseUrl}/rest/v1/students?select=marks_balance`, {
            headers
        });
        
        if (!balancesResponse.ok) {
            console.error('Failed to fetch balances:', balancesResponse.status, balancesResponse.statusText);
        }
        
        const balances = await balancesResponse.json();
        
        // Defensive check: ensure balances is an array
        const totalMarksInCirculation = Array.isArray(balances) 
            ? balances.reduce((sum: number, student: any) => sum + (student.marks_balance || 0), 0)
            : 0;

        return new Response(JSON.stringify({
            totalSchools: schoolsCount,
            totalStudents: studentsCount,
            totalTransactions: transactionsCount,
            totalMarksInCirculation
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Platform stats error:', error);

        const errorResponse = {
            error: {
                code: 'STATS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: error.message.includes('permissions') ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
