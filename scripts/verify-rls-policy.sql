-- Verify the RLS policy definition
SELECT
  pol.polname AS policy_name,
  pg_get_expr(pol.polqual, pol.polrelid) AS policy_definition
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'comments'
  AND pol.polname = 'comments select public or own';
