// DIAGNOSTIC VERSION - platform-transactions
// This version will help identify the exact error cause

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
        console.log('=== DIAGNOSTIC START ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);

        validateSuperAdminToken(req);

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;
        
        console.log('Page:', page, 'Limit:', limit, 'Offset:', offset);

        // Check environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        console.log('SUPABASE_URL:', supabaseUrl ? 'present' : 'MISSING');
        console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'present' : 'MISSING');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error(`Supabase configuration missing - URL: ${!!supabaseUrl}, Key: ${!!serviceRoleKey}`);
        }

        const headers = {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
        };

        console.log('Headers configured');

        // Test basic connectivity to ledger_transactions table
        const transactionsResponse = await fetch(
            `${supabaseUrl}/rest/v1/ledger_transactions?select=id,student_id,type,amount,description,created_at&order=created_at.desc&limit=1&offset=0`,
            { headers }
        );

        console.log('Transactions query response status:', transactionsResponse.status);
        console.log('Transactions query response ok:', transactionsResponse.ok);
        
        if (!transactionsResponse.ok) {
            const errorText = await transactionsResponse.text();
            console.error('Transactions query failed:', errorText);
            throw new Error(`Transactions table query failed: ${transactionsResponse.status} ${transactionsResponse.statusText}`);
        }

        const transactions = await transactionsResponse.json();
        console.log('Transactions query succeeded, got data:', Array.isArray(transactions) ? 'array' : typeof transactions, 'length:', Array.isArray(transactions) ? transactions.length : 'N/A');
        
        // Return diagnostic success
        return new Response(JSON.stringify({
            diagnostic: true,
            message: 'Transactions endpoint diagnostic completed successfully',
            data: {
                method: req.method,
                url: req.url,
                page,
                limit,
                environment: {
                    supabaseUrl: !!supabaseUrl,
                    serviceRoleKey: !!serviceRoleKey
                },
                transactionsQuery: {
                    status: transactionsResponse.status,
                    ok: transactionsResponse.ok,
                    dataType: Array.isArray(transactions) ? 'array' : typeof transactions,
                    dataLength: Array.isArray(transactions) ? transactions.length : 'N/A'
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('=== DIAGNOSTIC ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        const errorResponse = {
            diagnostic: true,
            error: {
                code: 'DIAGNOSTIC_FAILED',
                message: error.message,
                stack: error.stack
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});