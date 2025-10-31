SELECT id, name, email, role, school_id
FROM users
WHERE id = $1;
