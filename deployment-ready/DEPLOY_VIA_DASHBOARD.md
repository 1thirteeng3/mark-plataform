# Deploy Fixed Edge Functions via Supabase Dashboard

## Quick Deployment Guide (5 minutes)

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/cqrjiaskaperrmfiuewd/functions
2. Login to your Supabase account

### Step 2: Deploy platform-stats
1. Click on **platform-stats** function
2. Click **"Deploy new version"** button
3. Copy the entire content from `platform-stats-FIXED.ts` (see below)
4. Paste into the code editor
5. Click **"Deploy"**
6. Wait for "Deployed successfully" message

### Step 3: Deploy platform-students
1. Click on **platform-students** function
2. Click **"Deploy new version"** button
3. Copy the entire content from `platform-students-FIXED.ts` (see below)
4. Paste into the code editor
5. Click **"Deploy"**
6. Wait for "Deployed successfully" message

### Step 4: Deploy platform-transactions
1. Click on **platform-transactions** function
2. Click **"Deploy new version"** button
3. Copy the entire content from `platform-transactions-FIXED.ts` (see below)
4. Paste into the code editor
5. Click **"Deploy"**
6. Wait for "Deployed successfully" message

### Step 5: Verify
1. Open the API tester: Upload `api-tester.html` to any web server or open locally
2. Login with: admin@mark.local / test
3. Click "Test All" button
4. All three tests should show green "OK" status

---

## Fixed Code Files

The complete fixed code for each function is provided in separate files:
- `platform-stats-FIXED.ts`
- `platform-students-FIXED.ts`
- `platform-transactions-FIXED.ts`

Each file is ready to copy-paste directly into the Supabase Dashboard.

---

## Alternative: Deploy via Supabase CLI

If you have Supabase CLI installed and authenticated:

```bash
cd /workspace
supabase functions deploy platform-stats --project-ref cqrjiaskaperrmfiuewd
supabase functions deploy platform-students --project-ref cqrjiaskaperrmfiuewd
supabase functions deploy platform-transactions --project-ref cqrjiaskaperrmfiuewd
```

---

## Verification Commands

After deployment, test each endpoint:

```bash
# Get token
TOKEN=$(curl -s -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY" \
  -d '{"email":"admin@mark.local","password":"test"}' | jq -r '.token')

# Test platform-stats (should NOT have "balances.reduce is not a function" error)
curl -X GET "https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/platform-stats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-user-token: $TOKEN"

# Test platform-students (should NOT have "Failed to fetch students" error)
curl -X GET "https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/platform-students?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-user-token: $TOKEN"

# Test platform-transactions (should NOT have "Failed to fetch students" error)
curl -X GET "https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/platform-transactions?page=1&limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "x-user-token: $TOKEN"
```

All three should return valid JSON without error messages.
