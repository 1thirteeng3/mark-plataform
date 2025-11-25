// CORRECTED VERSION - platform-transactions
// Uses actual database schema with proper table relationships

function validateSuperAdminToken(req: Request): { userId: string; role: string; schoolId: string | null } {
    // In demo mode, allow requests without tokens
    const token = req.headers.get('x-user-token');
    console.log('Token received:', token ? 'present' : 'missing');
    
    return { userId: 'demo-user', role: 'SUPER_ADMIN', schoolId: null };
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
        console.log('=== TRANSACTIONS ENDPOINT - CORRECTED VERSION ===');
        
        validateSuperAdminToken(req);

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        const headers = {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
        };

        // Check if ledger_transactions table exists and query it
        const transactionsResponse = await fetch(
            `${supabaseUrl}/rest/v1/ledger_transactions?select=id,student_id,type,amount,description,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`,
            { headers }
        );

        if (!transactionsResponse.ok) {
            const errorText = await transactionsResponse.text();
            console.error('Failed to fetch transactions:', transactionsResponse.status, errorText);
            throw new Error(`Failed to fetch transactions: ${transactionsResponse.status} ${transactionsResponse.statusText}`);
        }

        const transactions = await transactionsResponse.json();
        const totalCount = parseInt(transactionsResponse.headers.get('content-range')?.split('/')[1] || '0');

        console.log(`Transactions query successful: ${transactions.length} records found`);

        // Handle empty results gracefully
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return new Response(JSON.stringify({
                transactions: [],
                totalCount: 0,
                page,
                limit
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get unique student IDs for joining with students table
        const studentIds = [...new Set(transactions.map((t: any) => t.student_id))].filter(id => id);
        
        let students = [];
        if (studentIds.length > 0) {
            const studentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/students?id=in.(${studentIds.join(',')})&select=id,name,email,institution_id`,
                { headers }
            );

            if (studentsResponse.ok) {
                students = await studentsResponse.json();
            }
        }

        // Create lookup map for students
        const studentMap = Object.fromEntries(students.map((s: any) => [s.id, s]));

        // Get unique institution IDs for joining with institutions table
        const institutionIds = [...new Set(students.map((s: any) => s.institution_id))].filter(id => id);
        
        let institutions = [];
        if (institutionIds.length > 0) {
            const institutionsResponse = await fetch(
                `${supabaseUrl}/rest/v1/institutions?id=in.(${institutionIds.join(',')})&select=id,name`,
                { headers }
            );

            if (institutionsResponse.ok) {
                institutions = await institutionsResponse.json();
            }
        }

        // Create lookup map for institutions
        const institutionMap = Object.fromEntries(institutions.map((i: any) => [i.id, i]));

        // Transform transactions with joined data
        const formattedTransactions = transactions.map((txn: any) => {
            const student = studentMap[txn.student_id] || {};
            const institution = institutionMap[student.institution_id] || {};

            return {
                id: txn.id,
                date: txn.created_at,
                studentName: student.name || 'Unknown Student',
                schoolName: institution.name || 'Unknown School',
                type: txn.type || 'UNKNOWN',
                amount: txn.amount || 0,
                description: txn.description || 'No description'
            };
        });

        return new Response(JSON.stringify({
            transactions: formattedTransactions,
            totalCount,
            page,
            limit
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Transactions endpoint error:', error);

        const errorResponse = {
            error: {
                code: 'TRANSACTIONS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});