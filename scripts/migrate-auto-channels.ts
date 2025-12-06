/**
 * Retroactive Auto-Channel Migration Script
 *
 * This script creates auto-generated channels for existing vibelogs
 * that already have a primary_topic assigned.
 *
 * What it does:
 * 1. Finds all vibelogs with primary_topic NOT NULL
 * 2. Groups them by user_id + primary_topic
 * 3. For each group, creates an auto-generated channel (if not exists)
 * 4. Updates all vibelogs in the group with the channel_id
 *
 * Run with: npx tsx scripts/migrate-auto-channels.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Topic display names for channel naming
const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  technology: 'Technology',
  business: 'Business',
  'personal-growth': 'Personal Growth',
  lifestyle: 'Lifestyle',
  'health-wellness': 'Health & Wellness',
  creativity: 'Creativity',
  education: 'Education',
  entertainment: 'Entertainment',
  travel: 'Travel',
  'food-cooking': 'Food & Cooking',
  relationships: 'Relationships',
  career: 'Career',
  finance: 'Finance',
  parenting: 'Parenting',
  sports: 'Sports',
  science: 'Science',
  politics: 'Politics',
  culture: 'Culture',
  spirituality: 'Spirituality',
  other: 'Other',
};

interface VibelogWithTopic {
  id: string;
  user_id: string;
  primary_topic: string;
  channel_id: string | null;
}

interface UserProfile {
  id: string;
  username: string;
}

interface GroupedVibelogs {
  userId: string;
  username: string;
  topic: string;
  vibelogIds: string[];
}

async function migrateAutoChannels() {
  console.log('🚀 Starting retroactive auto-channel migration...\n');

  // Step 1: Fetch all vibelogs with primary_topic that don't have a channel_id
  console.log('📊 Fetching vibelogs with topics but no channel...');
  const { data: vibelogs, error: vibelogsError } = await supabase
    .from('vibelogs')
    .select('id, user_id, primary_topic, channel_id')
    .not('primary_topic', 'is', null)
    .neq('primary_topic', 'other')
    .is('channel_id', null);

  if (vibelogsError) {
    console.error('❌ Error fetching vibelogs:', vibelogsError);
    process.exit(1);
  }

  if (!vibelogs || vibelogs.length === 0) {
    console.log('✅ No vibelogs need migration - all either have channels or no topics.');
    return;
  }

  console.log(`   Found ${vibelogs.length} vibelogs to process\n`);

  // Step 2: Get unique user IDs and fetch their profiles
  const userIds = [...new Set(vibelogs.map(v => v.user_id))];
  console.log(`👤 Fetching profiles for ${userIds.length} users...`);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
    process.exit(1);
  }

  const profileMap = new Map<string, string>();
  profiles?.forEach(p => {
    if (p.username) {
      profileMap.set(p.id, p.username);
    }
  });

  console.log(`   Found ${profileMap.size} users with usernames\n`);

  // Step 3: Group vibelogs by user_id + primary_topic
  const groups = new Map<string, GroupedVibelogs>();

  for (const vibelog of vibelogs as VibelogWithTopic[]) {
    const username = profileMap.get(vibelog.user_id);
    if (!username) {
      console.log(`   ⚠️  Skipping vibelog ${vibelog.id} - user has no username`);
      continue;
    }

    const key = `${vibelog.user_id}:${vibelog.primary_topic}`;
    if (!groups.has(key)) {
      groups.set(key, {
        userId: vibelog.user_id,
        username,
        topic: vibelog.primary_topic,
        vibelogIds: [],
      });
    }
    groups.get(key)!.vibelogIds.push(vibelog.id);
  }

  console.log(`📦 Grouped into ${groups.size} user-topic combinations\n`);

  // Step 4: Process each group
  let channelsCreated = 0;
  let vibelogsUpdated = 0;
  let errors = 0;

  for (const [key, group] of groups) {
    const { userId, username, topic, vibelogIds } = group;
    const handle = `${username}-${topic}`;
    const displayName = TOPIC_DISPLAY_NAMES[topic] || topic;

    console.log(`\n🌍 Processing: @${handle} (${vibelogIds.length} vibelogs)`);

    try {
      // Check if channel already exists
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('handle', handle)
        .single();

      let channelId: string;

      if (existingChannel) {
        channelId = existingChannel.id;
        console.log(`   ✓ Channel already exists: ${channelId}`);
      } else {
        // Create new channel
        const { data: newChannel, error: createError } = await supabase
          .from('channels')
          .insert({
            handle,
            name: displayName,
            owner_id: userId,
            primary_topic: topic,
            is_public: true,
            is_default: false,
            auto_generated: true,
            ai_display_name: null, // No AI name for retroactive migration
          })
          .select('id')
          .single();

        if (createError) {
          console.error(`   ❌ Error creating channel:`, createError.message);
          errors++;
          continue;
        }

        channelId = newChannel.id;
        channelsCreated++;
        console.log(`   ✓ Created channel: ${channelId}`);
      }

      // Update vibelogs with channel_id
      const { error: updateError } = await supabase
        .from('vibelogs')
        .update({ channel_id: channelId })
        .in('id', vibelogIds);

      if (updateError) {
        console.error(`   ❌ Error updating vibelogs:`, updateError.message);
        errors++;
        continue;
      }

      vibelogsUpdated += vibelogIds.length;
      console.log(`   ✓ Updated ${vibelogIds.length} vibelogs`);
    } catch (err) {
      console.error(`   ❌ Unexpected error:`, err);
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Channels created: ${channelsCreated}`);
  console.log(`   Vibelogs updated: ${vibelogsUpdated}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(50));

  if (errors === 0) {
    console.log('\n✅ Migration completed successfully!');
  } else {
    console.log(`\n⚠️  Migration completed with ${errors} errors. Check logs above.`);
  }
}

migrateAutoChannels().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
