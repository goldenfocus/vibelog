#!/bin/bash
# Script to apply the handle_new_user trigger fix directly to production
# This fixes the "Database error saving new user" issue

set -e

echo "🔧 Applying handle_new_user trigger fix to production..."

# Get the Supabase project ref from the URL
PROJECT_REF="ogqcycqctxulcvhjeiii"

echo "📋 Instructions:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "2. Copy and paste the SQL from: supabase/migrations/20251122000000_fix_handle_new_user_trigger.sql"
echo "3. Click 'Run' to execute the migration"
echo ""
echo "Or use this direct link:"
echo "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo ""
echo "The SQL file is located at:"
echo "$(pwd)/supabase/migrations/20251122000000_fix_handle_new_user_trigger.sql"
echo ""
echo "After running, test signup at your production site!"
