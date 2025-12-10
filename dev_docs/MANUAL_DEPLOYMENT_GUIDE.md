# Manual Deployment Guide - Mark Platform Evolution v1.1

## Quick Deployment via Supabase Dashboard (15 minutes)

This guide provides step-by-step instructions to deploy all components manually through the Supabase Dashboard.

---

## Prerequisites

- Access to Supabase Dashboard: https://supabase.com/dashboard/project/cqrjiaskaperrmfiuewd
- Admin privileges on the project
- The migration and edge function files from this workspace

---

## Part 1: Database Migration (5 minutes)

### Step 1: Open SQL Editor
1. Go to https://supabase.com/dashboard/project/cqrjiaskaperrmfiuewd
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Apply Migration
1. Copy the entire content from: `/workspace/supabase/migrations/1762300000_evolution_v1_1_hardening.sql`
2. Paste it into the SQL Editor
3. Click "Run" (or press Ctrl/Cmd + Enter)
4. Wait for completion (should take 5-10 seconds)

### Step 3: Verify Migration
Run this verification query in SQL Editor:
```sql
-- Check stored procedures
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN ('process_redemption', 'expire_school_balances', 'refresh_analytics');

-- Should return 3 rows

-- Check materialized view
SELECT matviewname 
FROM pg_matviews 
WHERE matviewname = 'analytics_school_engagement';

-- Should return 1 row

-- Check views
SELECT viewname 
FROM pg_views 
WHERE viewname IN ('school_financial_summary', 'top_students_by_school', 'top_rules_by_school');

-- Should return 3 rows

-- Check new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'enrollment_id';

-- Should return 1 row
```

If all queries return the expected number of rows, the migration was successful!

---

## Part 2: Deploy Edge Functions (8 minutes)

### Option A: Via Supabase Dashboard (Recommended)

#### Function 1: students-batch-import
1. Go to "Edge Functions" in the left sidebar
2. Click "New Function"
3. Name: `students-batch-import`
4. Copy content from: `/workspace/supabase/functions/students-batch-import/index.ts`
5. Paste into the editor
6. Click "Deploy"

#### Function 2: schools-analytics-financial
1. Click "New Function"
2. Name: `schools-analytics-financial`
3. Copy content from: `/workspace/supabase/functions/schools-analytics-financial/index.ts`
4. Paste and Deploy

#### Function 3: schools-analytics-performance
1. Click "New Function"
2. Name: `schools-analytics-performance`
3. Copy content from: `/workspace/supabase/functions/schools-analytics-performance/index.ts`
4. Paste and Deploy

#### Function 4: expire-marks-cron
1. Click "New Function"
2. Name: `expire-marks-cron`
3. Copy content from: `/workspace/supabase/functions/expire-marks-cron/index.ts`
4. Paste and Deploy

#### Function 5: vouchers-redeem-v2
1. Click "New Function"
2. Name: `vouchers-redeem-v2`
3. Copy content from: `/workspace/supabase/functions/vouchers-redeem-v2/index.ts`
4. Paste and Deploy

#### Function 6: auth-login-v2 (Optional - Enhanced Auth)
1. Click "New Function"
2. Name: `auth-login-v2`
3. Copy content from: `/workspace/supabase/functions/auth-login-v2/index.ts`
4. Paste and Deploy

**Note:** You also need to deploy the shared helper:
- Create `/workspace/supabase/functions/_shared/validateAdminToken.ts` in the same directory structure

### Option B: Via Supabase CLI (If authenticated)

If you have Supabase CLI authenticated, simply run:
```bash
cd /workspace
chmod +x deploy_evolution_v1_1.sh
./deploy_evolution_v1_1.sh
```

---

## Part 3: Configure Environment Secrets (2 minutes)

1. Go to "Edge Functions" > "Manage Secrets"
2. Add the following secrets:

```
JWT_SECRET_V1=mark-platform-secret-key-2024
CRON_SECRET=mark-platform-cron-secret-2024
```

3. Click "Save"

---

## Part 4: Setup Cron Job (Optional - 3 minutes)

### Via pg_cron Extension

1. Go to SQL Editor
2. Enable pg_cron if not already enabled:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

3. Create the cron job:
```sql
-- Schedule mark expiration for Dec 31 at midnight
SELECT cron.schedule(
    'expire-marks-annually',
    '0 0 31 12 *',
    $$
    SELECT net.http_post(
        url := 'https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/expire-marks-cron',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer mark-platform-cron-secret-2024"}'::jsonb
    );
    $$
);
```

4. Verify the cron job:
```sql
SELECT * FROM cron.job;
```

### Alternative: Manual Setup
- Create a reminder to run the expiration manually on Dec 31st
- Or use an external cron service like cron-job.org

---

## Part 5: Test Deployment (5 minutes)

### Test 1: Verify Functions Exist
1. Go to "Edge Functions"
2. You should see all 6 new functions listed
3. Check that each shows "Deployed" status

### Test 2: Test Batch Import
```bash
# Get admin token first
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@springfield.edu","password":"password123"}' \
  | jq -r '.token'

# Save the token, then test batch import
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/students-batch-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "students": [
      {
        "name": "Test Student",
        "email": "test.student@test.com",
        "enrollmentId": "TEST-001"
      }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "summary": {
    "total": 1,
    "imported": 1,
    "skipped": 0,
    "errors": 0
  }
}
```

### Test 3: Test Financial Analytics
```bash
curl -X GET https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/schools-analytics-financial \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected: JSON response with financial metrics

### Test 4: Test Stored Procedure (via SQL Editor)
```sql
-- Test with a real student ID and voucher ID from your database
SELECT process_redemption(
  (SELECT id FROM students LIMIT 1),
  (SELECT id FROM voucher_catalog LIMIT 1),
  10
);
```

Expected: JSON response with status SUCCESS or ERROR (if insufficient balance)

### Test 5: Test Analytics Refresh
```sql
SELECT refresh_analytics();
```

Expected: No errors

---

## Part 6: Cleanup Test Data (Optional)

If you created test data during testing:
```sql
-- Remove test student
DELETE FROM students WHERE enrollment_id = 'TEST-001';
DELETE FROM users WHERE email = 'test.student@test.com';
```

---

## Troubleshooting

### Issue: Migration fails with syntax error
**Solution:** Make sure you copied the entire migration file, including the final semicolons

### Issue: Edge function deployment fails
**Solution:** 
1. Check that you have the _shared helper deployed first
2. Verify all imports are using relative paths
3. Check for any syntax errors in the TypeScript code

### Issue: Cron job not triggering
**Solution:**
1. Verify pg_cron extension is enabled
2. Check cron.job table for the schedule
3. Verify the CRON_SECRET matches in both the cron job and Edge Function secrets

### Issue: Analytics views return empty data
**Solution:**
1. The platform needs some historical data (transactions) to populate analytics
2. Run: `SELECT refresh_analytics();` to force a refresh
3. Check that ledger_transactions table has data

---

## Verification Checklist

After deployment, verify:

- [ ] Migration applied successfully (run verification queries from Part 1)
- [ ] All 6 edge functions show "Deployed" status
- [ ] Environment secrets are set (JWT_SECRET_V1, CRON_SECRET)
- [ ] Batch import test passes
- [ ] Financial analytics endpoint returns data
- [ ] Performance analytics endpoint returns data
- [ ] Stored procedures can be called successfully
- [ ] Cron job is scheduled (if applicable)

---

## Success Criteria

Your deployment is successful when:

1. **Database:** All stored procedures, views, and indexes exist
2. **Edge Functions:** All 6 functions are deployed and responding
3. **Batch Import:** Can import students via API
4. **Analytics:** Both analytics endpoints return proper JSON
5. **Atomic Redemption:** vouchers-redeem-v2 works without race conditions

---

## Post-Deployment Steps

1. **Update Frontend (if needed):** Integrate new endpoints into your React app
2. **Monitor Logs:** Check Edge Function logs for any errors
3. **Performance Tuning:** Run EXPLAIN ANALYZE on slow queries
4. **Documentation:** Share API Reference with your team
5. **Backup:** Create a backup before making further changes

---

## Quick Reference

**Dashboard URL:** https://supabase.com/dashboard/project/cqrjiaskaperrmfiuewd

**New Endpoints:**
- POST /students-batch-import
- GET /schools-analytics-financial
- GET /schools-analytics-performance
- POST /vouchers-redeem-v2
- POST /auth-login-v2
- POST /expire-marks-cron (cron only)

**Documentation:**
- Implementation Guide: `/workspace/EVOLUTION_V1_1_IMPLEMENTATION_GUIDE.md`
- API Reference: `/workspace/EVOLUTION_V1_1_API_REFERENCE.md`
- Deployment Summary: `/workspace/EVOLUTION_V1_1_DEPLOYMENT_SUMMARY.md`

---

## Support

If you encounter issues:
1. Check the Supabase logs in the Dashboard
2. Review the troubleshooting section above
3. Consult the implementation guide for detailed technical information
4. Test each component individually to isolate issues

---

**Total Deployment Time:** Approximately 15-20 minutes
**Difficulty:** Moderate (mostly copy-paste operations)
**Risk:** Low (all changes are additive, no destructive operations)

Good luck with your deployment!
