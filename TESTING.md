# Testing Guide 🧪

This project uses a layered testing strategy to ensure quality and stability.

## 1. Continuous Integration (CI)
Our GitHub Actions pipeline (`.github/workflows/ci.yml`) runs automatically on every Pull Request.
It checks:
*   **Edge Functions**: Type checking (Deno).
*   **Frontend**: Linting (`npm run lint`) and Build Verification (`npm run build`).

## 2. Database Tests (pgTAP)
We use `pgTAP` to verify the database schema and logic.
Location: `supabase/tests/supa_tests.sql`

To run locally (requires Supabase CLI):
```bash
supabase test db
```

## 3. Manual Verification (API Tester)
For end-to-end verification of the deployed system, use the provided API Tester tool.
1.  Open `api-tester-v2.0-final.html` in your browser.
2.  Login with Admin credentials.
3.  Run the "Scenario 1: Full Flow" to verify:
    *   Auth
    *   Rule Creation
    *   Marks Awarding
    *   Redemption (2PC)

## 4. Cron Job Verification
To verify the "Economic Governance" (Annual Expiration):
1.  Check the `cron.job` table in SQL Editor:
    ```sql
    SELECT * FROM cron.job;
    ```
2.  Check the `cron.job_run_details` for execution logs.
