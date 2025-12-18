-- Migration: Auto-Award Engine Schema (JSONB Warehouse)
-- Created at: 1762300030
-- Description: Adds tables for batch history and columns for flexible rule criteria

-- ========================================
-- 1. Batch Import History (The Warehouse)
-- ========================================

CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    admin_id UUID NOT NULL REFERENCES users(id),
    filename VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PROCESSING', -- PROCESSING, COMPLETED, FAILED, COMPLETED_WITH_ERRORS
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying school history
CREATE INDEX IF NOT EXISTS idx_import_batches_school ON import_batches(school_id, created_at DESC);

-- ========================================
-- 2. Raw Import Records (JSONB Flexibility)
-- ========================================

CREATE TABLE IF NOT EXISTS import_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    student_email VARCHAR(255), -- Used for linking, nullable if new student
    enrollment_id VARCHAR(100), -- Alternative linking
    
    -- THE CORE: Flexible Data Storage
    raw_data JSONB NOT NULL,
    
    -- Processing Status
    is_processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, MATCHED, ERROR
    processing_log TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast batch retrieval
CREATE INDEX IF NOT EXISTS idx_import_records_batch ON import_records(batch_id);

-- GIN Index for fast JSONB querying (Crucial for rule engine)
-- Allows queries like: SELECT * FROM records WHERE raw_data->'frequency' > 90
CREATE INDEX IF NOT EXISTS idx_import_records_data ON import_records USING GIN (raw_data);

-- ========================================
-- 3. Flexible Rule Criteria
-- ========================================

-- Update school_rules to "understand" the JSONB data
ALTER TABLE school_rules 
ADD COLUMN IF NOT EXISTS criteria_field VARCHAR(50),      -- e.g., 'frequency', 'grade_avg'
ADD COLUMN IF NOT EXISTS criteria_operator VARCHAR(10),   -- e.g., '>=', '=', '<', 'CONTAINS'
ADD COLUMN IF NOT EXISTS criteria_value VARCHAR(100);     -- e.g., '90', 'A'

-- Index for finding auto-rules
CREATE INDEX IF NOT EXISTS idx_school_rules_criteria ON school_rules(school_id) 
WHERE criteria_field IS NOT NULL; -- Partial index for optimization

-- ========================================
-- 4. RLS Policies
-- ========================================

-- Enable RLS
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_records ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can see batches for their school
CREATE POLICY "Admins can view their school batches" ON import_batches
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.school_id = import_batches.school_id 
            AND users.role = 'ADMIN'
        )
    );

-- Policy: Service Role (Edge Function) has full access
CREATE POLICY "Service Role full access batches" ON import_batches
    FOR ALL 
    USING (auth.role() = 'service_role');

CREATE POLICY "Service Role full access records" ON import_records
    FOR ALL 
    USING (auth.role() = 'service_role');
