/**
 * Supabase Client (Anon Key)
 * For public/authenticated user operations with RLS
 * 
 * @module _shared/supabaseClient
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * Get Supabase client with anon key (respects RLS)
 * Use this for operations on behalf of authenticated users
 */
export function getSupabaseClient() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Get Supabase REST API URL for direct fetch calls
 */
export function getRestUrl(): string {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
        throw new Error('Missing SUPABASE_URL environment variable');
    }
    return `${supabaseUrl}/rest/v1`;
}

/**
 * Get headers for REST API calls with anon key
 */
export function getAnonHeaders(): Record<string, string> {
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseAnonKey) {
        throw new Error('Missing SUPABASE_ANON_KEY environment variable');
    }

    return {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
    };
}
