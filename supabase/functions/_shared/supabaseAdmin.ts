/**
 * Supabase Admin Client (Service Role Key)
 * For administrative operations that bypass RLS
 * 
 * WARNING: Only use for trusted server-side operations
 * 
 * @module _shared/supabaseAdmin
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * Get Supabase admin client with service role key (bypasses RLS)
 * Use this only for administrative operations
 */
export function getSupabaseAdmin() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Get headers for REST API calls with service role key
 */
export function getAdminHeaders(): Record<string, string> {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }

    return {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    };
}

/**
 * Get Supabase REST API URL
 */
export function getRestUrl(): string {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
        throw new Error('Missing SUPABASE_URL environment variable');
    }
    return `${supabaseUrl}/rest/v1`;
}
