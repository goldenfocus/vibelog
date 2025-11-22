#!/bin/bash

# Script to apply profile fields migration to Supabase
# This adds header_image, bio, and social links to the profiles table

echo "🔧 Applying profile fields migration..."
echo ""
echo "This migration will add the following columns to profiles table:"
echo "  - header_image (for banner images)"
echo "  - bio (for user descriptions)"
echo "  - twitter_url, instagram_url, linkedin_url, github_url"
echo "  - youtube_url, tiktok_url, facebook_url, threads_url, website_url"
echo ""
echo "Choose how to apply this migration:"
echo ""
echo "Option 1: Using Supabase CLI (recommended)"
echo "  supabase migration up"
echo ""
echo "Option 2: Manual via Supabase Dashboard"
echo "  1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo "  2. Copy the contents of: supabase/migrations/002_add_profile_fields.sql"
echo "  3. Paste and run in SQL Editor"
echo ""
echo "Option 3: Run directly with psql (if you have direct DB access)"
echo "  psql YOUR_DATABASE_URL < supabase/migrations/002_add_profile_fields.sql"
echo ""

read -p "Do you want to apply via Supabase CLI now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Running: supabase migration up"
    supabase migration up

    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully!"
        echo ""
        echo "You can now:"
        echo "  - Upload header images in Profile Settings"
        echo "  - Add bio and social links"
        echo "  - Changes will persist after refresh"
    else
        echo "❌ Migration failed. Please apply manually via dashboard."
    fi
else
    echo "Migration not applied. Please use one of the options above."
fi
