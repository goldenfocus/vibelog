'use client';

import { User, Eye, Heart, Zap, Calendar, Crown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface CreatorCardProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalVibelogs: number;
  totalViews: number;
  totalLikes: number;
  totalRemixes: number;
  joinedDate: string;
  subscriptionTier?: string;
  index?: number; // For stagger animation
}

export default function CreatorCard({
  username,
  displayName,
  avatarUrl,
  totalVibelogs,
  totalViews,
  totalLikes,
  totalRemixes,
  joinedDate,
  subscriptionTier = 'free',
  index = 0,
}: CreatorCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate days since joined
  const daysSinceJoined = Math.floor(
    (Date.now() - new Date(joinedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const joinedText =
    daysSinceJoined < 7
      ? 'New creator! 🌟'
      : daysSinceJoined < 30
        ? `${daysSinceJoined} days ago`
        : daysSinceJoined < 365
          ? `${Math.floor(daysSinceJoined / 30)} months ago`
          : `${Math.floor(daysSinceJoined / 365)} years ago`;

  // Determine if this is a top creator (high engagement)
  const engagementScore = totalVibelogs * 10 + totalViews + totalLikes * 5 + totalRemixes * 3;
  const isTopCreator = engagementScore > 1000 || subscriptionTier === 'pro';

  return (
    <Link
      href={`/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-electric/20 ${
          isTopCreator
            ? 'border-electric/50 bg-gradient-to-br from-card via-card to-electric/5'
            : 'border-border/30 hover:border-electric/30'
        } `}
      >
        {/* Top Creator Badge */}
        {isTopCreator && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-electric/10 px-2 py-1 text-xs font-medium text-electric">
            <Crown className="h-3 w-3" />
            <span>Top Creator</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="mb-4 flex items-center gap-4">
          <div className="relative">
            {/* Glow effect on hover */}
            {isHovered && (
              <div className="absolute inset-0 animate-pulse rounded-full bg-electric/30 blur-xl" />
            )}

            {/* Avatar */}
            <div
              className={`relative h-20 w-20 overflow-hidden rounded-full border-2 transition-all duration-300 ${isHovered ? 'border-electric shadow-lg shadow-electric/50' : 'border-border/50'} `}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-electric/20 to-violet-500/20">
                  <User className="h-10 w-10 text-electric" />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-foreground transition-colors group-hover:text-electric">
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <StatItem icon={Zap} label="Vibelogs" value={totalVibelogs} />
          <StatItem icon={Eye} label="Views" value={formatNumber(totalViews)} />
          <StatItem icon={Heart} label="Likes" value={formatNumber(totalLikes)} />
          <StatItem
            icon={Zap}
            label="Remixes"
            value={formatNumber(totalRemixes)}
            highlight={totalRemixes > 0}
          />
        </div>

        {/* Joined Date */}
        <div className="flex items-center gap-2 border-t border-border/30 pt-4 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Joined {joinedText}</span>
        </div>

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'pointer-events-none opacity-0'} `}
        >
          <div className="rounded-lg bg-electric px-6 py-3 font-semibold text-white shadow-lg">
            View Profile →
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Link>
  );
}

// Stat Item Component
function StatItem({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: any;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2 transition-all ${
        highlight ? 'border-electric/30 bg-electric/5' : 'border-border/20 bg-muted/30'
      } `}
    >
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${highlight ? 'text-electric' : 'text-muted-foreground'}`}
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={`truncate text-sm font-semibold ${highlight ? 'text-electric' : 'text-foreground'}`}
        >
          {value}
        </div>
      </div>
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
