-- Migration: 1762300025_phase7_schema
-- Description: Phase 7 Feature Completion (Schema Updates)
-- Adds columns for Batch Import and Advanced Analytics

BEGIN;

-- 1. Update Students Table
-- Add 'grade' (Class/Turma)
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

-- Add 'guardian_email' (Responsável)
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(255);

-- Add 'enrollment_id' (Matrícula) - ensuring it exists and is indexed
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_id ON students(enrollment_id);

-- 2. Update Analytics View (Data Intelligence)
-- We need to recreate the materialized view to include new groupings if needed.
-- For now, we will create a NEW view for "Class Performance" to avoid breaking the existing one.

CREATE OR REPLACE VIEW analytics_class_performance AS
SELECT 
    s.school_id,
    s.grade,
    COUNT(s.id) as total_students,
    COUNT(s.id) FILTER (WHERE s.marks_balance > 0) as active_students,
    COALESCE(SUM(s.marks_balance), 0) as total_balance,
    -- Engagement Score: Active / Total (0-100)
    CASE 
        WHEN COUNT(s.id) > 0 THEN (COUNT(s.id) FILTER (WHERE s.marks_balance > 0)::FLOAT / COUNT(s.id)::FLOAT) * 100
        ELSE 0
    END as engagement_score
FROM students s
WHERE s.grade IS NOT NULL
GROUP BY s.school_id, s.grade;

COMMIT;
