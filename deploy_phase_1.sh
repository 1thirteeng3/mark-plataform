#!/bin/bash
# Deployment Script for Phase 1: Atomicity and Financial Consistency

set -e

echo "Starting deployment for Phase 1..."

# 1. Apply Migration
echo "Applying migration 1762300005_phase1_atomicity.sql..."
supabase db push

# 2. Deploy Edge Function
echo "Deploying awards function..."
supabase functions deploy awards --no-verify-jwt

echo "Phase 1 Deployment Complete!"
