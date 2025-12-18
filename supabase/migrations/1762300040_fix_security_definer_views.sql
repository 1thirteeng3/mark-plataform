-- Migration: Security Hardening (Fix Security Definer Views)
-- Created at: 1762300040
-- Description: Enables security_invoker on views to ensure RLS is respected (Fixes Supabase Security Advisors)

-- 1. School Financial Summary
ALTER VIEW school_financial_summary SET (security_invoker = true);

-- 2. Top Rules by School
ALTER VIEW top_rules_by_school SET (security_invoker = true);

-- 3. Analytics Class Performance
ALTER VIEW analytics_class_performance SET (security_invoker = true);

-- 4. Top Students by School
ALTER VIEW top_students_by_school SET (security_invoker = true);
