# Mark Platform Evolution v1.1 - API Quick Reference

## New Endpoints

### 1. Batch Import Students
**Endpoint:** `POST /students-batch-import`
**Authentication:** Bearer token (ADMIN role)
**Content-Type:** application/json

**Request:**
```json
{
  "students": [
    {
      "name": "Maria Santos",
      "email": "maria.santos@escola.com.br",
      "guardianEmail": "mae.maria@email.com",
      "grade": "7° Ano B",
      "enrollmentId": "2024-150"
    },
    {
      "name": "Pedro Costa",
      "email": "pedro.costa@escola.com.br",
      "guardianEmail": "pai.pedro@email.com",
      "grade": "8° Ano A",
      "enrollmentId": "2024-151"
    }
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "imported": 2,
    "skipped": 0,
    "errors": 0
  },
  "errors": [],
  "message": "2 alunos importados com sucesso, 0 ignorados (duplicados), 0 erros"
}
```

**Error Response:**
```json
{
  "success": true,
  "summary": {
    "total": 3,
    "imported": 2,
    "skipped": 0,
    "errors": 1
  },
  "errors": [
    {
      "line": 3,
      "error": "Formato de email inválido"
    }
  ],
  "message": "2 alunos importados com sucesso, 0 ignorados (duplicados), 1 erros"
}
```

**cURL Example:**
```bash
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/students-batch-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "students": [
      {
        "name": "Test Student",
        "email": "test@escola.com.br",
        "enrollmentId": "2024-999"
      }
    ]
  }'
```

---

### 2. Financial Analytics
**Endpoint:** `GET /schools-analytics-financial`
**Authentication:** Bearer token (ADMIN or SUPER_ADMIN)
**Query Parameters:** 
- `schoolId` (optional, SUPER_ADMIN only)

**Success Response:**
```json
{
  "schoolId": "123e4567-e89b-12d3-a456-426614174000",
  "period": "30 days",
  "financial": {
    "circulatingMarks": 15000,
    "totalStudents": 500,
    "studentsWithBalance": 380,
    "liability": 15000
  },
  "metrics": {
    "totalMinted": 25000,
    "totalRedeemed": 8000,
    "totalExpired": 2000,
    "burnRate": 40.0,
    "velocity": 1.67
  },
  "timeline": [
    {
      "date": "2025-11-20",
      "activeStudents": 320,
      "minted": 850,
      "redeemed": 340,
      "expired": 0
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/schools-analytics-financial \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 3. Performance Analytics
**Endpoint:** `GET /schools-analytics-performance`
**Authentication:** Bearer token (ADMIN or SUPER_ADMIN)
**Query Parameters:** 
- `schoolId` (optional, SUPER_ADMIN only)

**Success Response:**
```json
{
  "schoolId": "123e4567-e89b-12d3-a456-426614174000",
  "performance": {
    "totalStudents": 500,
    "avgBalance": 30.5,
    "activeStudents": 380,
    "engagementRate": 76.0
  },
  "topStudents": [
    {
      "rank": 1,
      "studentId": "uuid",
      "name": "Ana Silva",
      "currentBalance": 250,
      "lifetimeEarned": 500,
      "lifetimeSpent": 250
    }
  ],
  "topRules": [
    {
      "ruleId": "uuid",
      "ruleName": "Participação em Aula",
      "marksAwarded": 5,
      "timesTriggered": 1500,
      "totalMarksAwarded": 7500
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/schools-analytics-performance \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 4. Voucher Redemption V2 (Atomic)
**Endpoint:** `POST /vouchers-redeem-v2`
**Authentication:** Bearer token (STUDENT role)
**Content-Type:** application/json

**Request:**
```json
{
  "voucherId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Success Response:**
```json
{
  "success": true,
  "redemption": {
    "id": "uuid",
    "voucherName": "R$ 10 Amazon Gift Card",
    "voucherCode": "MARK-XYZ123ABC",
    "cost": 100,
    "newBalance": 50
  },
  "message": "Voucher resgatado com sucesso!"
}
```

**Error Response (Insufficient Balance):**
```json
{
  "error": "Saldo insuficiente"
}
```

**cURL Example:**
```bash
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/vouchers-redeem-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -d '{
    "voucherId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

---

### 5. Expire Marks Cron Job
**Endpoint:** `POST /expire-marks-cron`
**Authentication:** Bearer token (CRON_SECRET)
**Execution:** Automated via cron schedule

**Success Response:**
```json
{
  "success": true,
  "executionTime": "2025-12-31T00:00:00.000Z",
  "summary": {
    "totalSchools": 5,
    "totalMarksExpired": 50000,
    "totalStudentsAffected": 1200,
    "analyticsRefreshed": true
  },
  "results": [
    {
      "schoolId": "uuid",
      "schoolName": "Springfield High School",
      "status": "SUCCESS",
      "marksExpired": 15000,
      "studentsAffected": 350
    }
  ]
}
```

**Manual Trigger (for testing):**
```bash
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/expire-marks-cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Database Stored Procedures

### 1. process_redemption()
**Purpose:** Atomic voucher redemption with race condition protection

**Call via SQL:**
```sql
SELECT process_redemption(
  'student-uuid',
  'voucher-uuid',
  100
);
```

**Response:**
```json
{
  "status": "SUCCESS",
  "redemptionId": "uuid",
  "newBalance": 50,
  "schoolId": "uuid"
}
```

**Or via REST API:**
```bash
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/rest/v1/rpc/process_redemption \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -d '{
    "p_student_id": "student-uuid",
    "p_voucher_id": "voucher-uuid",
    "p_cost": 100
  }'
```

---

### 2. expire_school_balances()
**Purpose:** Expire all marks for a school

**Call via SQL:**
```sql
SELECT expire_school_balances(
  'school-uuid',
  '2025-12-31'
);
```

**Response:**
```json
{
  "status": "SUCCESS",
  "schoolId": "uuid",
  "expirationDate": "2025-12-31",
  "totalMarksExpired": 15000,
  "studentsAffected": 350,
  "timestamp": "2025-12-31T00:00:00.000Z"
}
```

**Or via REST API:**
```bash
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/rest/v1/rpc/expire_school_balances \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -d '{
    "p_school_id": "school-uuid",
    "p_expiration_date": "2025-12-31"
  }'
```

---

### 3. refresh_analytics()
**Purpose:** Refresh materialized views

**Call via SQL:**
```sql
SELECT refresh_analytics();
```

**Or via REST API:**
```bash
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/rest/v1/rpc/refresh_analytics \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

---

## Materialized Views & Standard Views

### Query: analytics_school_engagement
```sql
SELECT * FROM analytics_school_engagement
WHERE school_id = 'your-school-uuid'
ORDER BY ref_date DESC
LIMIT 30;
```

### Query: school_financial_summary
```sql
SELECT * FROM school_financial_summary
WHERE school_id = 'your-school-uuid';
```

### Query: top_students_by_school
```sql
SELECT * FROM top_students_by_school
WHERE school_id = 'your-school-uuid'
AND rank <= 10
ORDER BY rank ASC;
```

### Query: top_rules_by_school
```sql
SELECT * FROM top_rules_by_school
WHERE school_id = 'your-school-uuid'
ORDER BY times_triggered DESC
LIMIT 10;
```

---

## Testing Workflow

### 1. Test Batch Import
```bash
# Login as ADMIN
TOKEN=$(curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@springfield.edu","password":"password123"}' \
  | jq -r '.token')

# Import students
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/students-batch-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @test-students.json
```

### 2. Test Analytics
```bash
# Financial analytics
curl -X GET https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/schools-analytics-financial \
  -H "Authorization: Bearer $TOKEN"

# Performance analytics
curl -X GET https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/schools-analytics-performance \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test Atomic Redemption
```bash
# Login as STUDENT
STUDENT_TOKEN=$(curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@springfield.edu","password":"password123"}' \
  | jq -r '.token')

# Get voucher ID from catalog
VOUCHER_ID=$(curl -X GET https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/vouchers-catalog \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  | jq -r '.vouchers[0].id')

# Redeem voucher
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/vouchers-redeem-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d "{\"voucherId\":\"$VOUCHER_ID\"}"
```

### 4. Test Expiration (Manual)
```bash
# Set CRON_SECRET environment variable
export CRON_SECRET="mark-platform-cron-secret"

# Trigger expiration
curl -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/expire-marks-cron \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Environment Variables Reference

```bash
# JWT Secrets (for authentication)
JWT_SECRET_V1="mark-platform-secret-key-2024"
JWT_SECRET_V2=""  # Optional, for key rotation

# Cron Job Secret
CRON_SECRET="mark-platform-cron-secret"

# Supabase (auto-configured)
SUPABASE_URL="https://cqrjiaskaperrmfiuewd.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_ANON_KEY="your-anon-key"
```

---

## Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 401 | Token de autenticação ausente | Include Authorization header |
| 401 | Token inválido ou usuário não autorizado | Refresh token or re-login |
| 403 | Apenas administradores podem... | Check user role |
| 400 | Saldo insuficiente | Check student balance before redemption |
| 404 | Aluno não encontrado | Verify student ID |
| 500 | Erro interno do servidor | Check logs via get_logs() |

---

## Performance Benchmarks

| Endpoint | Expected Response Time | Max Acceptable |
|----------|------------------------|----------------|
| batch-import (100 students) | < 2 seconds | < 5 seconds |
| analytics-financial | < 500ms | < 1 second |
| analytics-performance | < 500ms | < 1 second |
| vouchers-redeem-v2 | < 200ms | < 500ms |
| expire-marks-cron (5 schools) | < 5 seconds | < 15 seconds |

---

**Last Updated:** 2025-11-20
**API Version:** v1.1.0
**Base URL:** https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/
