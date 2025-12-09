// Voucher Redemption V2 - Resilient Two-Phase Commit (2PC) + Reloadly Integration
// Module 4: Resilient Integration
// Orchestrates transactions across distributed systems (Database + External Providers)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
        const { voucherId, forceFailure } = await req.json(); // forceFailure for testing

        if (!voucherId) {
            return new Response(
                JSON.stringify({ error: 'ID do voucher é obrigatório' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // --- 1. AUTHENTICATION & VALIDATION ---
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Token ausente' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length < 2) throw new Error("Invalid Token");
        const payload = JSON.parse(atob(parts[1]));

        if (payload.role !== 'STUDENT') {
            return new Response(
                JSON.stringify({ error: 'Apenas alunos podem resgatar vouchers' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Get Student ID
        const studentRes = await fetch(`${supabaseUrl}/rest/v1/students?user_id=eq.${payload.userId}&select=id`, {
            headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        const students = await studentRes.json();
        if (students.length === 0) throw new Error('Student not found');
        const studentId = students[0].id;

        // Get Voucher Details (Need provider_product_id)
        const voucherRes = await fetch(`${supabaseUrl}/rest/v1/voucher_catalog?id=eq.${voucherId}&select=provider_product_id,name`, {
            headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        const vouchers = await voucherRes.json();
        if (vouchers.length === 0) throw new Error('Voucher not found');
        const voucher = vouchers[0];

        // --- 2. PHASE 1: PREPARE (Reserve Funds) ---
        console.log(`[2PC] Step 1: Preparing redemption for voucher ${voucherId}...`);

        const prepareRes = await fetch(`${supabaseUrl}/rest/v1/rpc/prepare_redemption`, {
            method: 'POST',
            headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_student_id: studentId, p_voucher_id: voucherId })
        });

        if (!prepareRes.ok) {
            const err = await prepareRes.text();
            throw new Error(`Prepare failed: ${err}`);
        }

        const prepareResult = await prepareRes.json();
        if (prepareResult.status === 'ERROR') {
            return new Response(
                JSON.stringify({ error: prepareResult.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const redemptionId = prepareResult.redemption_id;
        console.log(`[2PC] Reservation successful. ID: ${redemptionId}`);

        // --- 3. EXECUTE (External Provider) ---
        let externalRef = "";
        let secretCode = "";

        try {
            console.log(`[2PC] Step 2: Calling External Provider...`);

            if (forceFailure) {
                // Testing Hook
                throw new Error("Simulated External API Failure");
            }

            // Check if we have Reloadly Secrets
            const clientId = Deno.env.get('RELOADLY_CLIENT_ID');
            const clientSecret = Deno.env.get('RELOADLY_CLIENT_SECRET');

            if (clientId && clientSecret && voucher.provider_product_id) {
                // REAL RELOADLY INTEGRATION
                const orderResult = await callReloadly(clientId, clientSecret, voucher.provider_product_id, redemptionId);
                externalRef = orderResult.transactionId;
                // Some vouchers give a PIN, some give a Link. We take what we can get.
                secretCode = orderResult.pinDetail?.code || orderResult.pinDetail?.link || "RELOADLY-SENT-VIA-EMAIL";
            } else {
                // SIMULATION MODE (Graceful degradation for Dev)
                console.warn("Reloadly Secrets missing or Product ID missing. Using Simulation.");
                await new Promise(r => setTimeout(r, 1000));
                externalRef = `SIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                secretCode = `DEMO-CODE-${Math.random().toString(36).substr(2, 5)}`;
            }

            // --- 4. PHASE 2: COMMIT (Confirm) ---
            console.log(`[2PC] Step 3: Confirming transaction...`);

            await fetch(`${supabaseUrl}/rest/v1/rpc/confirm_redemption`, {
                method: 'POST',
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_redemption_id: redemptionId, p_external_ref: externalRef })
            });

            // Optional: Update Secret Code (if stored separately, or in 'voucher_code' column)
            // Re-using the patch logic from original or just relying on database structure
            // Assuming 'voucher_code' in redeemed_vouchers is where we store the PIN
            await fetch(`${supabaseUrl}/rest/v1/redeemed_vouchers?id=eq.${redemptionId}`, {
                method: 'PATCH',
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ voucher_code: secretCode })
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Voucher resgatado com sucesso! (Confirmado)',
                    voucherCode: secretCode
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );

        } catch (executionError) {
            // --- 5. PHASE 2: ROLLBACK (Compensate) ---
            console.error(`[2PC] Execution failed! Rolling back... Error: ${executionError.message}`);

            await fetch(`${supabaseUrl}/rest/v1/rpc/rollback_redemption`, {
                method: 'POST',
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_redemption_id: redemptionId, p_reason: executionError.message })
            });

            return new Response(
                JSON.stringify({
                    error: 'Falha na emissão do voucher. Seus marks foram estornados.',
                    details: executionError.message,
                    status: 'ROLLBACK_EXECUTED'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
            );
        }

    } catch (error) {
        console.error('Redemption Fatal Error:', error);
        return new Response(
            JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

// --- HELPER: RELOADLY API ---
async function callReloadly(clientId: string, clientSecret: string, productId: string, refId: string) {
    // 1. Get Access Token
    const env = Deno.env.get('RELOADLY_ENV') === 'LIVE' ? 'https://auth.reloadly.com' : 'https://auth-sandbox.reloadly.com';
    const apiBase = Deno.env.get('RELOADLY_ENV') === 'LIVE' ? 'https://giftcards.reloadly.com' : 'https://giftcards-sandbox.reloadly.com';

    const tokenRes = await fetch(`${env}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
            audience: apiBase
        })
    });

    if (!tokenRes.ok) {
        const txt = await tokenRes.text();
        throw new Error(`Reloadly Auth Failed: ${txt}`);
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Place Order
    console.log(`[Reloadly] Ordering Product ${productId}...`);
    const orderRes = await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            productId: parseInt(productId),
            quantity: 1,
            unitPrice: 10, // TODO: In production, fetch dynamic price or map correctly. Hardcoded for MVP safety to verify connectivity.
            senderName: "Mark Platform",
            recipientEmail: "demo@user.com", // In prod, use user.email
            customIdentifier: refId
        })
    });

    if (!orderRes.ok) {
        const txt = await orderRes.text();
        // If "Product not found", user needs to update catalog
        throw new Error(`Reloadly Order Failed: ${txt}`);
    }

    const orderData = await orderRes.json();
    console.log(`[Reloadly] Order Success: ${orderData.transactionId}`);

    return {
        transactionId: orderData.transactionId.toString(),
        pinDetail: orderData.pinDetail // Contains code/link
    };
}
