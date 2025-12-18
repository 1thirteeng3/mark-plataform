-- Migration: Security Hardening (Secure Materialized View)
-- Created at: 1762300050
-- Description: Revokes public API access to materialized view to prevent data exposure (Fixes Supabase Security Advisors)

REVOKE ALL ON TABLE public.analytics_school_engagement FROM anon, authenticated;
REVOKE ALL ON TABLE public.analytics_school_engagement FROM public;
