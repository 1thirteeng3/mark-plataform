-- Fix: Add missing 'metadata' column to ledger_transactions
-- Required for Phase 3 (Batch ID) and Phase 4 (2PC State)

ALTER TABLE ledger_transactions
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Optional: Add index on metadata for debugging/searching later
CREATE INDEX IF NOT EXISTS idx_ledger_metadata ON ledger_transactions USING gin (metadata);
