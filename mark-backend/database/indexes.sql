-- Latency Optimization Indexes

-- Heaviest queries likely involve ledger_transactions by student and date
CREATE INDEX IF NOT EXISTS idx_ledger_student_date ON ledger_transactions (student_id, created_at DESC);

-- Index for redeemed vouchers by student
CREATE INDEX IF NOT EXISTS idx_redeemed_vouchers_student ON redeemed_vouchers (student_id);

-- Index for students by email (for login)
CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);
