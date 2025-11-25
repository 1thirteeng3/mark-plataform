#!/bin/bash
# Deployment script for fixed edge functions
# Run this after Supabase token is refreshed

set -e

echo "========================================"
echo "Mark Platform - Critical Fixes Deployment"
echo "========================================"
echo ""

PROJECT_REF="cqrjiaskaperrmfiuewd"

echo "Deploying fixed edge functions..."
echo ""

# Deploy platform-stats
echo "[1/3] Deploying platform-stats..."
supabase functions deploy platform-stats --project-ref $PROJECT_REF
echo "✓ platform-stats deployed"
echo ""

# Deploy platform-students
echo "[2/3] Deploying platform-students..."
supabase functions deploy platform-students --project-ref $PROJECT_REF
echo "✓ platform-students deployed"
echo ""

# Deploy platform-transactions
echo "[3/3] Deploying platform-transactions..."
supabase functions deploy platform-transactions --project-ref $PROJECT_REF
echo "✓ platform-transactions deployed"
echo ""

echo "========================================"
echo "Deployment complete!"
echo "========================================"
echo ""
echo "Testing endpoints..."
echo ""

# Get token
echo "Getting super admin token..."
TOKEN_RESPONSE=$(curl -s -X POST https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/auth-login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY" \
  -d '{"email":"admin@mark.local","password":"test"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✓ Got token"
echo ""

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY"

# Test platform-stats
echo "Testing platform-stats..."
STATS_RESPONSE=$(curl -s -X GET "https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/platform-stats" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "x-user-token: $TOKEN")

if echo "$STATS_RESPONSE" | jq -e '.error' > /dev/null; then
    echo "❌ platform-stats has errors:"
    echo "$STATS_RESPONSE" | jq '.'
else
    echo "✓ platform-stats working"
    echo "$STATS_RESPONSE" | jq '.'
fi
echo ""

# Test platform-students
echo "Testing platform-students..."
STUDENTS_RESPONSE=$(curl -s -X GET "https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/platform-students?page=1&limit=20" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "x-user-token: $TOKEN")

if echo "$STUDENTS_RESPONSE" | jq -e '.error' > /dev/null; then
    echo "❌ platform-students has errors:"
    echo "$STUDENTS_RESPONSE" | jq '.'
else
    echo "✓ platform-students working"
    echo "$STUDENTS_RESPONSE" | jq '{students: (.students | length), totalCount: .totalCount}'
fi
echo ""

# Test platform-transactions
echo "Testing platform-transactions..."
TRANSACTIONS_RESPONSE=$(curl -s -X GET "https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/platform-transactions?page=1&limit=50" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "x-user-token: $TOKEN")

if echo "$TRANSACTIONS_RESPONSE" | jq -e '.error' > /dev/null; then
    echo "❌ platform-transactions has errors:"
    echo "$TRANSACTIONS_RESPONSE" | jq '.'
else
    echo "✓ platform-transactions working"
    echo "$TRANSACTIONS_RESPONSE" | jq '{transactions: (.transactions | length), totalCount: .totalCount}'
fi
echo ""

echo "========================================"
echo "All tests complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Rebuild frontend: cd /workspace/mark-platform && pnpm run build"
echo "2. Deploy frontend with fixed URL"
echo "3. Test in browser with credentials: admin@mark.local / (any password)"
