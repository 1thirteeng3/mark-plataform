-- Rename the existing marks_balance column to active_marks_balance
ALTER TABLE students RENAME COLUMN marks_balance TO active_marks_balance;

-- Add the expired_marks_balance column with a default of 0
ALTER TABLE students ADD COLUMN expired_marks_balance INT DEFAULT 0;

-- Create the expiration_events table to log the annual expiration process
CREATE TABLE expiration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expiration_date DATE NOT NULL,
    total_marks_expired INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
