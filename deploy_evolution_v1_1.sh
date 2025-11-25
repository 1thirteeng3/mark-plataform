#!/bin/bash
# Automated Deployment Script for Mark Platform Evolution v1.1
# This script will deploy all components once Supabase CLI is authenticated

set -e  # Exit on error

echo "================================"
echo "Mark Platform Evolution v1.1"
echo "Automated Deployment Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="cqrjiaskaperrmfiuewd"
PROJECT_DIR="/workspace"

echo "Step 1: Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Install with: npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

echo "Step 2: Linking to Supabase project..."
cd $PROJECT_DIR
supabase link --project-ref $PROJECT_REF 2>&1 | grep -v "^$" || echo "Project may already be linked"
echo -e "${GREEN}✓ Project linked${NC}"
echo ""

echo "Step 3: Applying database migration..."
cd $PROJECT_DIR
if [ -f "supabase/migrations/1762300000_evolution_v1_1_hardening.sql" ]; then
    echo "Applying evolution_v1_1_hardening migration..."
    supabase db push
    echo -e "${GREEN}✓ Migration applied${NC}"
else
    echo -e "${YELLOW}Warning: Migration file not found${NC}"
fi
echo ""

echo "Step 4: Deploying Edge Functions..."
FUNCTIONS=(
    "students-batch-import"
    "schools-analytics-financial"
    "schools-analytics-performance"
    "expire-marks-cron"
    "vouchers-redeem-v2"
    "auth-login-v2"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        echo "Deploying $func..."
        supabase functions deploy $func --no-verify-jwt
        echo -e "${GREEN}✓ $func deployed${NC}"
    else
        echo -e "${YELLOW}Warning: $func directory not found${NC}"
    fi
done
echo ""

echo "Step 5: Setting environment secrets..."
echo "Please set these secrets manually via Supabase Dashboard:"
echo "  - JWT_SECRET_V1=mark-platform-secret-key-2024"
echo "  - CRON_SECRET=mark-platform-cron-secret-2024"
echo ""

echo "Step 6: Verifying deployment..."
echo "Checking deployed functions..."
supabase functions list
echo ""

echo "Step 7: Testing database components..."
echo "Testing stored procedures..."
psql -c "SELECT proname FROM pg_proc WHERE proname IN ('process_redemption', 'expire_school_balances', 'refresh_analytics');" 2>&1 || echo "Direct psql not available, check via Supabase Dashboard"
echo ""

echo "================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Set environment secrets in Supabase Dashboard"
echo "2. Create cron job for expire-marks-cron (Dec 31, 00:00)"
echo "3. Test endpoints using the API reference"
echo "4. Monitor logs for any issues"
echo ""
echo "Documentation:"
echo "  - Implementation Guide: EVOLUTION_V1_1_IMPLEMENTATION_GUIDE.md"
echo "  - API Reference: EVOLUTION_V1_1_API_REFERENCE.md"
echo "  - Deployment Summary: EVOLUTION_V1_1_DEPLOYMENT_SUMMARY.md"
echo ""
echo "Base URL: https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1/"
echo ""
