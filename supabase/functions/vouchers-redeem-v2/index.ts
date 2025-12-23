/**
 * POST /vouchers-redeem-v2
 * Voucher Redemption V2 - Resilient Two-Phase Commit (2PC) + Reloadly Integration
 * 
 * Required Role: STUDENT
 * Body: { voucherId: string, forceFailure?: boolean }
 * Response: { success: true, voucherCode: string }
 */

import { requireAuth, requireRole } from "../_shared/auth.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getAdminHeaders, getRestUrl } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        // Authenticate user
        const authResult = await requireAuth(req);
        if (authResult instanceof Response) return authResult;

        const { payload } = authResult;

        // Check role (STUDENT required)
        const roleError = requireRole(payload, ['STUDENT']);
        if (roleError) return roleError;

        const { voucherId, forceFailure } = await req.json();

        if (!voucherId) {
            return errorResponse('ID do voucher é obrigatório', req, 400);
        }

        const restUrl = getRestUrl();
        const headers = getAdminHeaders();

        // Get Student ID
        const studentRes = await fetch(`${restUrl}/students?user_id=eq.${payload.userId}&select=id`, { headers });
        const students = await studentRes.json();
        if (students.length === 0) {
            return errorResponse('Student not found', req, 404);
        }
        const studentId = students[0].id;

        // Get Voucher Details
        const voucherRes = await fetch(`${restUrl}/voucher_catalog?id=eq.${voucherId}&select=provider_product_id,name`, { headers });
        const vouchers = await voucherRes.json();
        if (vouchers.length === 0) {
            return errorResponse('Voucher not found', req, 404);
        }
        const voucher = vouchers[0];

        // --- PHASE 1: PREPARE (Reserve Funds) ---
        console.log(`[2PC] Step 1: Preparing redemption for voucher ${voucherId}...`);

        const prepareRes = await fetch(`${restUrl}/rpc/prepare_redemption`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_student_id: studentId, p_voucher_id: voucherId }),
        });

        if (!prepareRes.ok) {
            const err = await prepareRes.text();
            throw new Error(`Prepare failed: ${err}`);
        }

        const prepareResult = await prepareRes.json();
        if (prepareResult.status === 'ERROR') {
            return errorResponse(prepareResult.message, req, 400);
        }

        const redemptionId = prepareResult.redemption_id;
        console.log(`[2PC] Reservation successful. ID: ${redemptionId}`);

        // --- EXECUTE (External Provider) ---
        let externalRef = "";
        let secretCode = "";

        try {
            console.log(`[2PC] Step 2: Calling External Provider...`);

            if (forceFailure) {
                throw new Error("Simulated External API Failure");
            }

            const clientId = Deno.env.get('RELOADLY_CLIENT_ID');
            const clientSecret = Deno.env.get('RELOADLY_CLIENT_SECRET');

            if (clientId && clientSecret && voucher.provider_product_id) {
                const orderResult = await callReloadly(clientId, clientSecret, voucher.provider_product_id, redemptionId);
                externalRef = orderResult.transactionId;
                secretCode = orderResult.pinDetail?.code || orderResult.pinDetail?.link || "RELOADLY-SENT-VIA-EMAIL";
            } else {
                console.warn("Reloadly Secrets missing. Using Simulation.");
                await new Promise(r => setTimeout(r, 1000));
                externalRef = `SIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                secretCode = `DEMO-CODE-${Math.random().toString(36).substr(2, 5)}`;
            }

            // --- PHASE 2: COMMIT ---
            console.log(`[2PC] Step 3: Confirming transaction...`);

            await fetch(`${restUrl}/rpc/confirm_redemption`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_redemption_id: redemptionId, p_external_ref: externalRef }),
            });

            await fetch(`${restUrl}/redeemed_vouchers?id=eq.${redemptionId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ voucher_code: secretCode }),
            });

            return jsonResponse({
                success: true,
                message: 'Voucher resgatado com sucesso! (Confirmado)',
                voucherCode: secretCode,
            }, req);

        } catch (executionError) {
            // --- ROLLBACK ---
            console.error(`[2PC] Execution failed! Rolling back... Error: ${executionError.message}`);

            await fetch(`${restUrl}/rpc/rollback_redemption`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_redemption_id: redemptionId, p_reason: executionError.message }),
            });

            return new Response(
                JSON.stringify({
                    error: 'Falha na emissão do voucher. Seus marks foram estornados.',
                    details: executionError.message,
                    status: 'ROLLBACK_EXECUTED',
                }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }

    } catch (error) {
        console.error('[vouchers-redeem-v2] Error:', error);
        return errorResponse(error.message, req, 500);
    }
});

// --- HELPER: RELOADLY API ---
async function callReloadly(clientId: string, clientSecret: string, productId: string, refId: string) {
    const env = Deno.env.get('RELOADLY_ENV') === 'LIVE' ? 'https://auth.reloadly.com' : 'https://auth-sandbox.reloadly.com';
    const apiBase = Deno.env.get('RELOADLY_ENV') === 'LIVE' ? 'https://giftcards.reloadly.com' : 'https://giftcards-sandbox.reloadly.com';

    const tokenRes = await fetch(`${env}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
            audience: apiBase,
        }),
    });

    if (!tokenRes.ok) {
        throw new Error(`Reloadly Auth Failed: ${await tokenRes.text()}`);
    }
    const { access_token } = await tokenRes.json();

    const orderRes = await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            productId: parseInt(productId),
            quantity: 1,
            unitPrice: 10,
            senderName: "Mark Platform",
            recipientEmail: "demo@user.com",
            customIdentifier: refId,
        }),
    });

    if (!orderRes.ok) {
        throw new Error(`Reloadly Order Failed: ${await orderRes.text()}`);
    }

    const orderData = await orderRes.json();
    return {
        transactionId: orderData.transactionId.toString(),
        pinDetail: orderData.pinDetail,
    };
}
