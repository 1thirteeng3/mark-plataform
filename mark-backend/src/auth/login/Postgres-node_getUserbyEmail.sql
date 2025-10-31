SELECT
  u.id,
  u.name,
  u.email,
  u.password_hash,
  u.role,
  u.school_id
FROM users u
WHERE u.email = $1;
