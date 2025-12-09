-- Fix RLS Policy for School Rules
-- Force re-creation of the public read policy

ALTER TABLE school_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public View Rules" ON school_rules;

-- Explicitly targeting 'public' (which includes anon)
CREATE POLICY "Public View Rules" 
ON school_rules 
FOR SELECT 
TO public 
USING (true);

-- Verify it worked by checking count (if run in SQL Editor)
-- This won't show in result unless we select it, but useful for user sanity check
SELECT count(*) as rule_count FROM school_rules;
