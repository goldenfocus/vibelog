'use client';

import { Search, TrendingUp, Users, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import CreatorCard from '@/components/CreatorCard';
import Navigation from '@/components/Navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Creator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_vibelogs: number;
  total_views: number;
  total_shares: number;
  created_at: string;
  subscription_tier: string;
}

type SortOption = 'recent' | 'popular' | 'active';

export default function PeoplePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  useEffect(() => {
    fetchCreators();
  }, [sortBy]);

  async function fetchCreators() {
    try {
      setLoading(true);
      const supabase = createBrowserSupabaseClient();

      // Fetch public profiles with their vibelog stats
      let query = supabase
        .from('profiles')
        .select(
          `
          id,
          username,
          display_name,
          avatar_url,
          total_vibelogs,
          total_views,
          total_shares,
          created_at,
          subscription_tier
        `
        )
        .eq('is_public', true)
        .not('username', 'is', null);

      // Apply sorting
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'popular') {
        query = query.order('total_views', { ascending: false });
      } else if (sortBy === 'active') {
        query = query.order('total_vibelogs', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Error fetching creators:', error);
        return;
      }

      setCreators(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter creators by search query
  const filteredCreators = creators.filter(
    creator =>
      creator.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/5 px-4 py-2 text-sm font-medium text-electric">
              <Users className="h-4 w-4" />
              <span>Discover Amazing Creators</span>
            </div>
            <h1 className="mb-4 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-5xl font-bold text-transparent dark:from-blue-400 dark:to-violet-400 sm:text-6xl">
              People
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Discover creators and their latest voice-first posts. Join the vibelog community.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-muted/30 py-2 pl-10 pr-4 text-sm transition-all focus:border-electric/50 focus:outline-none focus:ring-2 focus:ring-electric/20"
              />
            </div>

            {/* Sort Options */}
            <div className="flex gap-2">
              <SortButton
                active={sortBy === 'popular'}
                onClick={() => setSortBy('popular')}
                icon={TrendingUp}
                label="Popular"
              />
              <SortButton
                active={sortBy === 'active'}
                onClick={() => setSortBy('active')}
                icon={Sparkles}
                label="Active"
              />
              <SortButton
                active={sortBy === 'recent'}
                onClick={() => setSortBy('recent')}
                icon={Users}
                label="New"
              />
            </div>
          </div>

          {/* Stats Banner */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Creators" value={creators.length} icon={Users} color="blue" />
            <StatCard
              label="Total Vibelogs"
              value={creators.reduce((sum, c) => sum + c.total_vibelogs, 0)}
              icon={Sparkles}
              color="violet"
            />
            <StatCard
              label="Total Views"
              value={formatNumber(creators.reduce((sum, c) => sum + c.total_views, 0))}
              icon={TrendingUp}
              color="electric"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-2xl border border-border/30 bg-muted/20"
                />
              ))}
            </div>
          )}

          {/* Creators Grid */}
          {!loading && filteredCreators.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCreators.map((creator, index) => (
                <CreatorCard
                  key={creator.id}
                  username={creator.username}
                  displayName={creator.display_name || creator.username}
                  avatarUrl={creator.avatar_url}
                  totalVibelogs={creator.total_vibelogs}
                  totalViews={creator.total_views}
                  totalLikes={0} // TODO: Add likes from vibelogs aggregate
                  totalRemixes={0} // TODO: Add remixes when implemented
                  joinedDate={creator.created_at}
                  subscriptionTier={creator.subscription_tier}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredCreators.length === 0 && (
            <div className="py-16 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-muted/50 p-6">
                  <Search className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold">No creators found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? `No creators match "${searchQuery}"`
                  : 'Be the first to create a vibelog!'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Sort Button Component
function SortButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'border-electric bg-electric text-white shadow-lg shadow-electric/30'
          : 'border-border/50 bg-background text-muted-foreground hover:border-electric/50 hover:text-foreground'
      } `}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-500',
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-500',
    electric: 'from-electric/10 to-electric/5 border-electric/20 text-electric',
  }[color];

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${colorClasses}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5 opacity-50" />
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
