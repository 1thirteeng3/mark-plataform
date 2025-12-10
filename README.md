# Mark Platform v2.0 🎓🚀

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Stack](https://img.shields.io/badge/tech-Supabase%20%7C%20Next.js%20%7C%20Deno-black)

**Mark Platform** is an elite "Gamified Financial System" for educational institutions. It transforms student behavior into a digital currency ("marks") with a fully audited, banking-grade ledger system.

---

## 🌟 Key Features (v2.0)

### 1. 🛡️ Banking-Grade Integrity
*   **Double-Entry Ledger**: Every transaction is immutable formatted.
*   **2PC Redemption Engine**: Two-Phase Commit protocol (`prepare` -> `execute` -> `confirm`) ensures 100% transactional safety even with external API failures.
*   **Economic Governance**: Automatic "Yearly Burn" policies via Cron Jobs.

### 2. ⚡ High-Performance Architecture
*   **Edge Functions**: All business logic runs on distributed Supabase Edge Functions (Deno).
*   **Materialized Analytics**: Real-time engagement dashboards powered by indexed SQL Views (`analytics_class_performance`).
*   **Role-Based Security**: Strict RLS (Row Level Security) and Custom JWT Claims.

### 3. 📱 Modern Experience
*   **Student Wallet**: Mobile-first dashboard for balance and history.
*   **Admin Console**: Financial KPIs, Burn Reports, and Class Rankings.
*   **Batch Operations**: Bulk import 1000+ students with validation.

---

## 📂 Project Structure

Verified and cleaned for production release.

*   `mark-platform/` - **Frontend Application** (Next.js 14, Tailwind, TypeScript).
*   `supabase/` - **Backend Infrastructure** (Migrations, Edge Functions, Tests).
*   `dev_docs/` - **Documentation & Reports**:
    *   `GO_LIVE_GUIDE.md`: 🚀 **Manual Deployment Instructions**.
    *   `MANUAL_DEPLOYMENT_GUIDE.md`: Deep dive on Supabase Dashboard.
    *   `reports/`: Historical development logs and QA reports.

---

## 🚀 Quick Start

### Prerequisites
*   Node.js v18+
*   Supabase CLI (optional, for local dev)

### Installation
```bash
cd mark-platform
npm install
npm run dev
```

### Deployment
To deploy the backend updates (Schema + Functions) to Supabase, refer to **[GO_LIVE_GUIDE.md](dev_docs/GO_LIVE_GUIDE.md)**.

> **Note**: The CI/CD pipeline is configured in `.github/workflows/ci.yml`.

---

## 🧪 Verification

Run the bundled API Tester to verify the live environment:
1.  Open `api-tester-v2.0-final.html` in your browser.
2.  Login as Admin.
3.  Execute "Fetch Class Analytics" and "Batch Import".

---

*(c) 2025 Mark Platform. "Where Grades Become Value."*
