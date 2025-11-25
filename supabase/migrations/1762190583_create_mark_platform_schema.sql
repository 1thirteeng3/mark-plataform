-- Migration: create_mark_platform_schema
-- Created at: 1762190583

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM types
CREATE TYPE user_role AS ENUM ('ADMIN', 'STUDENT');
CREATE TYPE transaction_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE redemption_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- Schools table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    school_id UUID NOT NULL,
    marks_balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_id)
);

-- School rules table
CREATE TABLE school_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    marks_to_award INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voucher catalog table
CREATE TABLE voucher_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    marks_cost INTEGER NOT NULL,
    provider_product_id VARCHAR(255) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Redeemed vouchers table
CREATE TABLE redeemed_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    voucher_catalog_id UUID NOT NULL,
    status redemption_status NOT NULL DEFAULT 'PENDING',
    voucher_code VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ledger transactions table
CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    source_rule_id UUID,
    source_redemption_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_ledger_transactions_student_id ON ledger_transactions(student_id);
CREATE INDEX idx_ledger_transactions_created_at ON ledger_transactions(created_at DESC);
CREATE INDEX idx_school_rules_school_id ON school_rules(school_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_redeemed_vouchers_student_id ON redeemed_vouchers(student_id);

-- RLS Policies (allow both anon and service_role as per best practices)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeemed_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to operate (both anon and service_role)
CREATE POLICY "Allow edge function access" ON schools FOR ALL USING (auth.role() IN ('anon', 'service_role'));
CREATE POLICY "Allow edge function access" ON users FOR ALL USING (auth.role() IN ('anon', 'service_role'));
CREATE POLICY "Allow edge function access" ON students FOR ALL USING (auth.role() IN ('anon', 'service_role'));
CREATE POLICY "Allow edge function access" ON school_rules FOR ALL USING (auth.role() IN ('anon', 'service_role'));
CREATE POLICY "Allow edge function access" ON voucher_catalog FOR ALL USING (auth.role() IN ('anon', 'service_role'));
CREATE POLICY "Allow edge function access" ON redeemed_vouchers FOR ALL USING (auth.role() IN ('anon', 'service_role'));
CREATE POLICY "Allow edge function access" ON ledger_transactions FOR ALL USING (auth.role() IN ('anon', 'service_role'));;