// Voucher Redemption V2 - Using Stored Procedure
// Module 0: Core Hardening - Transaction Atomicity
// Uses process_redemption() stored procedure for atomic operations

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 200 });
    }

    try {
        const { voucherId } = await req.json();

        if (!voucherId) {
            return new Response(
                JSON.stringify({ error: 'ID do voucher é obrigatório' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Get token from header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Token de autenticação ausente' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');

        // Decode JWT to get student info
        const parts = token.split('.');
        if (parts.length !== 3) {
            return new Response(
                JSON.stringify({ error: 'Token inválido' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const payload = JSON.parse(atob(parts[1]));

        if (payload.role !== 'STUDENT') {
            return new Response(
                JSON.stringify({ error: 'Apenas alunos podem resgatar vouchers' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Get student ID from user ID
        const studentResponse = await fetch(
            `${supabaseUrl}/rest/v1/students?user_id=eq.${payload.userId}&select=id`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        if (!studentResponse.ok) {
            throw new Error('Failed to fetch student data');
        }

        const students = await studentResponse.json();
        if (students.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Aluno não encontrado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        const studentId = students[0].id;

        // Get voucher details
        const voucherResponse = await fetch(
            `${supabaseUrl}/rest/v1/voucher_catalog?id=eq.${voucherId}&select=*`,
            {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
            }
        );

        if (!voucherResponse.ok) {
            throw new Error('Failed to fetch voucher data');
        }

        const vouchers = await voucherResponse.json();
        if (vouchers.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Voucher não encontrado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        const voucher = vouchers[0];

        if (!voucher.is_available) {
            return new Response(
                JSON.stringify({ error: 'Voucher não está disponível' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Call stored procedure for atomic redemption
        const redemptionResponse = await fetch(
            `${supabaseUrl}/rest/v1/rpc/process_redemption`,
            {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    p_student_id: studentId,
                    p_voucher_id: voucherId,
                    p_cost: voucher.marks_cost,
                }),
            }
        );

        if (!redemptionResponse.ok) {
            const errorText = await redemptionResponse.text();
            throw new Error(`Redemption failed: ${errorText}`);
        }

        const result = await redemptionResponse.json();

        if (result.status === 'ERROR') {
            return new Response(
                JSON.stringify({ 
                    error: result.message,
                    details: result.errorDetail,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // TODO: Integrate with external voucher provider API here
        // For now, we'll simulate the voucher code generation
        const voucherCode = `MARK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Update redemption status to COMPLETED and add voucher code
        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/redeemed_vouchers?id=eq.${result.redemptionId}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'COMPLETED',
                    voucher_code: voucherCode,
                    updated_at: new Date().toISOString(),
                }),
            }
        );

        return new Response(
            JSON.stringify({
                success: true,
                redemption: {
                    id: result.redemptionId,
                    voucherName: voucher.name,
                    voucherCode,
                    cost: voucher.marks_cost,
                    newBalance: result.newBalance,
                },
                message: 'Voucher resgatado com sucesso!',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Redemption error:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Erro ao resgatar voucher',
                details: error.message 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
