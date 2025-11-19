/*
  Batch Insert with Upsert
  
  Assumes the input is an array of objects, and n8n iterates or we pass a JSONB array.
  For better performance in n8n, usually we iterate, but for "Batch Processing" as requested,
  we can pass a JSON array to a function that unnest it.
  
  However, standard n8n Postgres node usually takes one item at a time or uses "Execute Once" with a query that handles multiple.
  
  Here is a query designed to handle a JSONB parameter $1 containing the array of students.
*/

INSERT INTO students (name, email, grade, enrollment_id, marks_balance, password_hash, role)
SELECT
  s->>'fullName',
  s->>'email',
  s->>'grade',
  s->>'registrationNumber',
  0, -- Initial balance
  s->>'passwordHash', -- Generated in previous step
  'STUDENT'
FROM jsonb_array_elements($1::jsonb) AS s
ON CONFLICT (email) DO NOTHING -- Or update if needed, spec says "DO NOTHING" to avoid errors
-- Also consider conflict on enrollment_id if unique
-- ON CONFLICT (enrollment_id) DO NOTHING
RETURNING id, email;
