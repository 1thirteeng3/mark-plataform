-- Migration: Security Hardening (Fix Function Search Paths)
-- Created at: 1762300045
-- Description: Sets explicit search_path=public for functions to prevent hijacking (Fixes Supabase Security Advisors)

-- 1. get_my_role
ALTER FUNCTION public.get_my_role() SET search_path = public;

-- 2. get_my_institution_id
ALTER FUNCTION public.get_my_institution_id() SET search_path = public;

-- 3. get_total_marks_by_institution
ALTER FUNCTION public.get_total_marks_by_institution(UUID) SET search_path = public;

-- 4. process_redemption
ALTER FUNCTION public.process_redemption(UUID, UUID, INTEGER) SET search_path = public;

-- 5. refresh_analytics
ALTER FUNCTION public.refresh_analytics() SET search_path = public;

-- 6. grant_marks
ALTER FUNCTION public.grant_marks(UUID, UUID, INTEGER, TEXT, UUID) SET search_path = public;

-- 7. prevent_ledger_modification
ALTER FUNCTION public.prevent_ledger_modification() SET search_path = public;
