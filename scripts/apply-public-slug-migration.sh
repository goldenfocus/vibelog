#!/bin/bash

# Apply migration to backfill public_slug for anonymous vibelogs
# This fixes vibelogs with ugly UUID URLs like /vibelogs/uuid

set -e

echo "🔧 Applying public_slug backfill migration..."

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Using Supabase CLI"
    supabase migration up
else
    echo "⚠️  Supabase CLI not found"
    echo ""
    echo "Please run this migration manually in Supabase Dashboard:"
    echo "1. Go to SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
    echo "2. Copy contents of: supabase/migrations/005_backfill_public_slugs.sql"
    echo "3. Paste and execute"
    echo ""
    echo "Or install Supabase CLI: brew install supabase/tap/supabase"
    exit 1
fi

echo ""
echo "✅ Migration complete!"
echo ""
echo "All anonymous vibelogs now have clean URLs like:"
echo "  /@anonymous/title-slug-shortid"
echo ""
echo "Instead of ugly URLs like:"
echo "  /vibelogs/uuid"
