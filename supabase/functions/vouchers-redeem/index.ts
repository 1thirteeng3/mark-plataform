// Redeem voucher for marks
// POST /vouchers-redeem
// Headers: Authorization: Bearer {token}
// Body: { voucherId: string }
// Response: { success: true, voucherCode: string, newBalance: number }

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

        // Verify role is STUDENT
        if (payload.role !== 'STUDENT') {
            return new Response(JSON.stringify({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only students can redeem vouchers'
                }
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { voucherId } = await req.json();

        if (!voucherId) {
            throw new Error('Voucher ID is required');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Get student record
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

        // Get voucher details
        const voucherResponse = await fetch(
            `${supabaseUrl}/rest/v1/voucher_catalog?id=eq.${voucherId}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!voucherResponse.ok) {
            throw new Error('Failed to fetch voucher details');
        }

        const vouchers = await voucherResponse.json();

        if (!vouchers || vouchers.length === 0) {
            throw new Error('Voucher not found');
        }

        const voucher = vouchers[0];

        if (!voucher.is_available) {
            throw new Error('This voucher is no longer available');
        }

        // Check if student has enough marks
        if (student.marks_balance < voucher.marks_cost) {
            return new Response(JSON.stringify({
                error: {
                    code: 'INSUFFICIENT_MARKS',
                    message: `You need ${voucher.marks_cost} marks but only have ${student.marks_balance}`
                }
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // STEP 1: Deduct marks from student balance
        const newBalance = student.marks_balance - voucher.marks_cost;

        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?id=eq.${student.id}`,
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

        // STEP 2: Create redemption record (PENDING)
        const redemptionResponse = await fetch(`${supabaseUrl}/rest/v1/redeemed_vouchers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                student_id: student.id,
                voucher_catalog_id: voucherId,
                status: 'PENDING'
            })
        });

        if (!redemptionResponse.ok) {
            throw new Error('Failed to create redemption record');
        }

        const redemptions = await redemptionResponse.json();
        const redemption = redemptions[0];

        // STEP 3: Create ledger transaction (DEBIT)
        const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/ledger_transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                student_id: student.id,
                type: 'DEBIT',
                amount: voucher.marks_cost,
                description: `Redeemed: ${voucher.name}`,
                source_redemption_id: redemption.id
            })
        });

        if (!ledgerResponse.ok) {
            throw new Error('Failed to create ledger transaction');
        }

        // STEP 4: Call external voucher provider API (MOCK)
        let voucherCode = null;
        let redemptionStatus = 'COMPLETED';

        try {
            // Mock external API call
            // In production, replace with actual API call to voucher provider
            voucherCode = `MOCK-${voucher.provider_product_id}-${Date.now()}`;
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 100));

            // For demo, 90% success rate
            const randomSuccess = Math.random() < 0.9;
            
            if (!randomSuccess) {
                throw new Error('External API failed');
            }

        } catch (apiError) {
            console.error('External voucher API failed:', apiError);
            
            // COMPENSATION LOGIC: Restore marks
            redemptionStatus = 'FAILED';
            
            // Restore student balance
            const restoreResponse = await fetch(
                `${supabaseUrl}/rest/v1/students?id=eq.${student.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        marks_balance: student.marks_balance,
                        updated_at: new Date().toISOString()
                    })
                }
            );

            if (!restoreResponse.ok) {
                console.error('Failed to restore marks after API failure');
            }

            // Create compensation ledger entry
            await fetch(`${supabaseUrl}/rest/v1/ledger_transactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: student.id,
                    type: 'CREDIT',
                    amount: voucher.marks_cost,
                    description: `Refund: Failed redemption of ${voucher.name}`,
                    source_redemption_id: redemption.id
                })
            });
        }

        // STEP 5: Update redemption status
        await fetch(
            `${supabaseUrl}/rest/v1/redeemed_vouchers?id=eq.${redemption.id}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: redemptionStatus,
                    voucher_code: voucherCode,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (redemptionStatus === 'FAILED') {
            return new Response(JSON.stringify({
                error: {
                    code: 'REDEMPTION_FAILED',
                    message: 'Voucher provider API failed. Your marks have been restored.'
                }
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            voucherCode: voucherCode,
            newBalance: newBalance,
            message: `Successfully redeemed ${voucher.name}!`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Redeem voucher error:', error);

        const errorResponse = {
            error: {
                code: 'REDEEM_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
