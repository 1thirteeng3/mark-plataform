// Get student dashboard (balance and recent transactions)
// GET /students-dashboard
// Headers: Authorization: Bearer {token}
// Response: { balance: number, transactions: [...] }

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
        const authHeader = req.headers.get('x-user-token');
        if (!authHeader) {
            throw new Error('Authorization header is required');
        }

        // Extract and decode JWT token
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        
        if (parts.length < 2) {
            throw new Error('Invalid token format');
        }

        const payload = JSON.parse(atob(parts[1]));

        // Verify role is STUDENT
        if (payload.role !== 'STUDENT') {
            return new Response(JSON.stringify({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only students can access their dashboard'
                }
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get student record by user_id
        const studentResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?user_id=eq.${payload.userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!studentResponse.ok) {
            throw new Error('Failed to fetch student details');
        }

        const students = await studentResponse.json();

        if (!students || students.length === 0) {
            throw new Error('Student record not found');
        }

        const student = students[0];

        // Get recent transactions (last 20)
        const transactionsResponse = await fetch(
            `${supabaseUrl}/rest/v1/ledger_transactions?student_id=eq.${student.id}&order=created_at.desc&limit=20`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!transactionsResponse.ok) {
            throw new Error('Failed to fetch transactions');
        }

        const transactions = await transactionsResponse.json();

        // Convert to camelCase format
        const formattedTransactions = transactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            createdAt: tx.created_at
        }));

        return new Response(JSON.stringify({
            balance: student.marks_balance,
            transactions: formattedTransactions
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Dashboard error:', error);

        const errorResponse = {
            error: {
                code: 'DASHBOARD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
