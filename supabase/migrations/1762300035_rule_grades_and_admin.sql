-- Migration: Enhanced Rules (Target Grades)
-- Created at: 1762300035
-- Description: Adds target_grade to school_rules for specific class targeting

ALTER TABLE school_rules 
ADD COLUMN IF NOT EXISTS target_grade VARCHAR(50);

-- Index for optimization
CREATE INDEX IF NOT EXISTS idx_school_rules_target_grade ON school_rules(target_grade);
