# Deploy Student Redemptions Edge Function

## Quick Deployment Guide

The edge function code is ready but not deployed due to expired Supabase token.

### File Location
`/workspace/supabase/functions/student-redemptions/index.ts`

### Deployment Command

Once Supabase token is refreshed, run:

```typescript
batch_deploy_edge_functions([{
  "slug": "student-redemptions",
  "file_path": "/workspace/supabase/functions/student-redemptions/index.ts",
  "type": "normal",
  "description": "Get student voucher redemption history"
}])
```

### Expected Endpoint
`GET https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/student-redemptions`

### Authentication
- Requires valid STUDENT JWT token in `x-user-token` header
- Returns 403 if user is not a STUDENT role

### Response Format
```json
[
  {
    "id": "uuid",
    "voucherName": "Amazon Gift Card $10",
    "voucherCode": "XXXX-XXXX-XXXX-XXXX",
    "marksCost": 500,
    "redeemedAt": "2025-11-05T10:30:00Z",
    "status": "COMPLETED"
  }
]
```

### Testing After Deployment

Test with curl:
```bash
curl -X GET 'https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/student-redemptions' \
  -H 'Authorization: Bearer ANON_KEY' \
  -H 'apikey: ANON_KEY' \
  -H 'x-user-token: Bearer.STUDENT_JWT_TOKEN'
```

### Integration Status

✅ Frontend component created and integrated  
✅ API client method added  
✅ Type definitions added  
✅ Student dashboard tab added  
⏳ Edge function awaiting deployment  

Once deployed, the "Histórico de Resgates" tab will immediately work.
