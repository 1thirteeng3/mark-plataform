// Award marks to student
// POST /awards
// Headers: Authorization: Bearer {token}
// Body: { studentId: string, ruleId: string, description: string }
// Response: { success: true, newBalance: number, transaction: {...} }

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // Verify role is ADMIN
        if (payload.role !== 'ADMIN') {
            return new Response(JSON.stringify({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only admins can award marks'
                }
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { studentId, ruleId, description } = await req.json();

        if (!studentId || !ruleId) {
            throw new Error('Student ID and Rule ID are required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get rule details to know how many marks to award
        const ruleResponse = await fetch(
            `${supabaseUrl}/rest/v1/school_rules?id=eq.${ruleId}&school_id=eq.${payload.schoolId}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!ruleResponse.ok) {
            throw new Error('Failed to fetch rule details');
        }

        const rules = await ruleResponse.json();

        if (!rules || rules.length === 0) {
            throw new Error('Rule not found or does not belong to your school');
        }

        const rule = rules[0];

        if (!rule.is_active) {
            throw new Error('This rule is not active');
        }

        // Get student details
        const studentResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?id=eq.${studentId}&school_id=eq.${payload.schoolId}`,
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
            throw new Error('Student not found or does not belong to your school');
        }

        const student = students[0];

        // Update student balance (atomic operation)
        const newBalance = student.marks_balance + rule.marks_to_award;

        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?id=eq.${studentId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    marks_balance: newBalance,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!updateResponse.ok) {
            throw new Error('Failed to update student balance');
        }

        // Create ledger transaction
        const transactionDescription = description || `Awarded for: ${rule.rule_name}`;

        const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/ledger_transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                student_id: studentId,
                type: 'CREDIT',
                amount: rule.marks_to_award,
                description: transactionDescription,
                source_rule_id: ruleId
            })
        });

        if (!ledgerResponse.ok) {
            throw new Error('Failed to create ledger transaction');
        }

        const transactions = await ledgerResponse.json();
        const transaction = transactions[0];

        return new Response(JSON.stringify({
            success: true,
            newBalance: newBalance,
            transaction: {
                id: transaction.id,
                type: transaction.type,
                amount: transaction.amount,
                description: transaction.description,
                createdAt: transaction.created_at
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Award marks error:', error);

        const errorResponse = {
            error: {
                code: 'AWARD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
