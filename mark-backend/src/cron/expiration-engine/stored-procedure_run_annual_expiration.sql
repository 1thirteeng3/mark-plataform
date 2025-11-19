CREATE OR REPLACE FUNCTION run_annual_expiration()
RETURNS JSONB AS $$
DECLARE
    v_total_expired INT := 0;
    v_student RECORD;
    v_expiration_id UUID;
BEGIN
    -- Create a new expiration event and get its ID
    INSERT INTO expiration_events (expiration_date, total_marks_expired)
    VALUES (CURRENT_DATE, 0)
    RETURNING id INTO v_expiration_id;

    -- Loop through all students with a positive active_marks_balance
    FOR v_student IN SELECT id, active_marks_balance FROM students WHERE active_marks_balance > 0 LOOP
        -- Add the student's active balance to the total expired marks
        v_total_expired := v_total_expired + v_student.active_marks_balance;

        -- Move the active marks to the expired balance
        UPDATE students
        SET expired_marks_balance = expired_marks_balance + v_student.active_marks_balance,
            active_marks_balance = 0
        WHERE id = v_student.id;

        -- Create a ledger transaction for the expiration event
        INSERT INTO ledger_transactions (student_id, type, amount, description, source_expiration_id)
        VALUES (v_student.id, 'EXPIRATION', v_student.active_marks_balance, 'Annual Marks Expiration', v_expiration_id);
    END LOOP;

    -- Update the expiration event with the total expired marks
    UPDATE expiration_events
    SET total_marks_expired = v_total_expired
    WHERE id = v_expiration_id;

    -- Return a success message with the total expired marks
    RETURN jsonb_build_object('status', 'SUCCESS', 'totalMarksExpired', v_total_expired);

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
