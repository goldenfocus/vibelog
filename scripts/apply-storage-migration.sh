#!/bin/bash

# Script to apply storage bucket permissions migration
# This enables public read access for profile images and vibelogs

echo "🗄️  Applying storage permissions migration..."
echo ""
echo "This migration will:"
echo "  - Make 'vibelogs' bucket publicly readable"
echo "  - Allow users to upload/update/delete their own files"
echo "  - Make 'tts-audio' bucket publicly readable"
echo "  - Set up proper RLS policies for storage"
echo ""
echo "Choose how to apply this migration:"
echo ""
echo "Option 1: Using Supabase CLI (recommended)"
echo "  supabase migration up"
echo ""
echo "Option 2: Manual via Supabase Dashboard"
echo "  1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo "  2. Copy the contents of: supabase/migrations/003_storage_public_access.sql"
echo "  3. Paste and run in SQL Editor"
echo ""
echo "Option 3: Run directly with psql (if you have direct DB access)"
echo "  psql YOUR_DATABASE_URL < supabase/migrations/003_storage_public_access.sql"
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
        echo "Your storage buckets now have public read access."
        echo "Profile images and vibelogs will now load correctly!"
    else
        echo "❌ Migration failed. Please apply manually via dashboard."
    fi
else
    echo "Migration not applied. Please use one of the options above."
fi
