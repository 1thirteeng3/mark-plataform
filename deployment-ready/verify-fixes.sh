#!/bin/bash
# Automated verification script for fixed edge functions
# Run this AFTER deploying the fixes through Supabase Dashboard

set -e

echo "======================================================"
echo "Mark Platform v1.1 - Fix Verification Script"
echo "======================================================"
echo ""
echo "This script will test all three fixed edge functions"
echo "to confirm the errors have been resolved."
echo ""

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY"
FUNCTIONS_URL="https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Step 1: Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "${FUNCTIONS_URL}/auth-login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -d '{"email":"admin@mark.local","password":"test"}')

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Failed to get authentication token${NC}"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Got authentication token${NC}"
echo ""

# Test counters
PASS=0
FAIL=0

echo "======================================================"
echo "Testing Edge Functions"
echo "======================================================"
echo ""

# Test 1: platform-stats
echo "Test 1: platform-stats"
echo "------------------------------------------------------"
echo "Testing for: 'balances.reduce is not a function' error"
STATS_RESPONSE=$(curl -s -X GET "${FUNCTIONS_URL}/platform-stats" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "x-user-token: ${TOKEN}")

if echo "$STATS_RESPONSE" | grep -q "balances.reduce is not a function"; then
    echo -e "${RED}✗ FAILED: Still has 'balances.reduce is not a function' error${NC}"
    echo "Response: $STATS_RESPONSE"
    FAIL=$((FAIL + 1))
elif echo "$STATS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$STATS_RESPONSE" | jq -r '.error.message')
    echo -e "${RED}✗ FAILED: $ERROR_MSG${NC}"
    echo "Response: $STATS_RESPONSE"
    FAIL=$((FAIL + 1))
else
    echo -e "${GREEN}✓ PASSED: platform-stats working correctly${NC}"
    echo "Stats: $(echo $STATS_RESPONSE | jq -c '.')"
    PASS=$((PASS + 1))
fi
echo ""

# Test 2: platform-students
echo "Test 2: platform-students"
echo "------------------------------------------------------"
echo "Testing for: 'Failed to fetch students' error"
STUDENTS_RESPONSE=$(curl -s -X GET "${FUNCTIONS_URL}/platform-students?page=1&limit=20" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "x-user-token: ${TOKEN}")

if echo "$STUDENTS_RESPONSE" | grep -q "Failed to fetch students"; then
    echo -e "${RED}✗ FAILED: Still has 'Failed to fetch students' error${NC}"
    echo "Response: $STUDENTS_RESPONSE"
    FAIL=$((FAIL + 1))
elif echo "$STUDENTS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$STUDENTS_RESPONSE" | jq -r '.error.message')
    echo -e "${RED}✗ FAILED: $ERROR_MSG${NC}"
    echo "Response: $STUDENTS_RESPONSE"
    FAIL=$((FAIL + 1))
else
    STUDENT_COUNT=$(echo $STUDENTS_RESPONSE | jq -r '.totalCount // 0')
    echo -e "${GREEN}✓ PASSED: platform-students working correctly${NC}"
    echo "Found: $STUDENT_COUNT students"
    PASS=$((PASS + 1))
fi
echo ""

# Test 3: platform-transactions
echo "Test 3: platform-transactions"
echo "------------------------------------------------------"
echo "Testing for: 'Failed to fetch students' error"
TRANSACTIONS_RESPONSE=$(curl -s -X GET "${FUNCTIONS_URL}/platform-transactions?page=1&limit=50" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -H "x-user-token: ${TOKEN}")

if echo "$TRANSACTIONS_RESPONSE" | grep -q "Failed to fetch students"; then
    echo -e "${RED}✗ FAILED: Still has 'Failed to fetch students' error${NC}"
    echo "Response: $TRANSACTIONS_RESPONSE"
    FAIL=$((FAIL + 1))
elif echo "$TRANSACTIONS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$TRANSACTIONS_RESPONSE" | jq -r '.error.message')
    echo -e "${RED}✗ FAILED: $ERROR_MSG${NC}"
    echo "Response: $TRANSACTIONS_RESPONSE"
    FAIL=$((FAIL + 1))
else
    TXN_COUNT=$(echo $TRANSACTIONS_RESPONSE | jq -r '.totalCount // 0')
    echo -e "${GREEN}✓ PASSED: platform-transactions working correctly${NC}"
    echo "Found: $TXN_COUNT transactions"
    PASS=$((PASS + 1))
fi
echo ""

# Summary
echo "======================================================"
echo "Test Summary"
echo "======================================================"
echo ""
echo -e "Tests Passed: ${GREEN}$PASS${NC} / 3"
echo -e "Tests Failed: ${RED}$FAIL${NC} / 3"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "All edge functions are working correctly."
    echo "The Mark Platform v1.1 is now fixed and operational."
    echo ""
    echo "You can now test the website at:"
    echo "https://ixj8eph2m6gn.space.minimax.io"
    echo ""
    echo "Login with:"
    echo "  Email: admin@mark.local"
    echo "  Password: (any value)"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please verify that you deployed all three fixed functions:"
    echo "  1. platform-stats"
    echo "  2. platform-students"
    echo "  3. platform-transactions"
    echo ""
    echo "Deployment guide: deployment-ready/DEPLOY_VIA_DASHBOARD.md"
    echo ""
    exit 1
fi
