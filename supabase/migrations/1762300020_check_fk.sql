-- Diagnostic: Check Students FK and Institutions table
SELECT 
    conname AS constraint_name, 
    confrelid::regclass AS references_table
FROM pg_constraint 
WHERE conrelid = 'students'::regclass;

SELECT 
    tablename 
FROM pg_tables 
WHERE tablename = 'institutions' OR tablename = 'schools';
