-- Migration: Economic Governance (Cron Schedule)
-- Created at: 1762300060
-- Description: Schedules the annual expiration of marks using pg_cron (Fixes Evolution Plan Phase 2/3)

-- 1. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Create a wrapper function to execute the logic for ALL schools
-- This is necessary because pg_cron executes a single SQL command, and we need to iterate.
CREATE OR REPLACE FUNCTION public.trigger_annual_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
BEGIN
    -- Iterate over all schools using the existing Phase 3 function
    FOR r IN SELECT id FROM schools LOOP
        -- Execute expiration for each school (defaults to CURRENT_DATE)
        PERFORM public.expire_school_balances(r.id, CURRENT_DATE);
    END LOOP;

    -- Refresh analytics to reflect the changes
    PERFORM public.refresh_analytics();
END;
$$;

-- 3. Schedule the Cron Job
-- Cron Expression: '0 0 31 12 *' = At 00:00 on day-of-month 31 in December.
-- Validates if job already exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'annual-burn') THEN
        PERFORM cron.schedule('annual-burn', '0 0 31 12 *', 'SELECT public.trigger_annual_expiration()');
    END IF;
END $$;
