#!/bin/bash
# Apply AI Cost Tracking Migration to Supabase
# This script reads the SQL migration file and applies it to your Supabase database

set -e

echo "🚀 Applying AI Cost Tracking Migration..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Missing Supabase credentials in .env.local"
    echo "Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https:\/\/([^.]+).*/\1/')

echo "📋 Migration Details:"
echo "   Project: $PROJECT_REF"
echo "   File: supabase/migrations/20251120000000_add_ai_cost_tracking.sql"
echo ""

# Read the SQL file
SQL_FILE="supabase/migrations/20251120000000_add_ai_cost_tracking.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: Migration file not found: $SQL_FILE"
    exit 1
fi

echo "📝 Reading migration file..."
SQL_CONTENT=$(cat "$SQL_FILE")

echo "🔧 Executing SQL via Supabase REST API..."
echo ""

# Execute the SQL using Supabase REST API
RESPONSE=$(curl -s -X POST \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/exec" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d "{\"sql\": $(jq -n --arg sql "$SQL_CONTENT" '$sql')}")

# Check if response contains error
if echo "$RESPONSE" | grep -q "error"; then
    echo "⚠️  Warning: API returned an error (this is expected if using SQL Editor)"
    echo "   Response: $RESPONSE"
    echo ""
    echo "📌 ALTERNATIVE: Copy and paste the SQL directly into Supabase SQL Editor:"
    echo ""
    echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
    echo "   2. Paste the contents of: $SQL_FILE"
    echo "   3. Click 'Run'"
    echo ""
    echo "   The SQL file contains:"
    echo "   - CREATE TABLE ai_usage_log"
    echo "   - CREATE TABLE ai_cache"
    echo "   - CREATE TABLE ai_daily_costs"
    echo "   - Indexes and RLS policies"
    echo ""
else
    echo "✅ Migration executed successfully!"
    echo ""
fi

echo "🔍 Verifying tables..."
echo ""

# Verify each table exists
for TABLE in "ai_usage_log" "ai_cache" "ai_daily_costs"; do
    CHECK=$(curl -s -X GET \
      "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$TABLE?limit=0" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

    if echo "$CHECK" | grep -q "relation.*does not exist"; then
        echo "   ❌ $TABLE - NOT FOUND"
    else
        echo "   ✅ $TABLE - EXISTS"
    fi
done

echo ""
echo "🎉 Migration process complete!"
echo ""
echo "📊 Next Steps:"
echo "   1. Verify tables in Supabase Dashboard > Table Editor"
echo "   2. Test transcription API with cost tracking"
echo "   3. Monitor costs in ai_usage_log table"
echo "   4. Check daily totals in ai_daily_costs table"
echo ""
