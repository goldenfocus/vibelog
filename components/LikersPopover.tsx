'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

interface Liker {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  liked_at: string;
}

interface LikersPopoverProps {
  vibelogId: string;
  likeCount: number;
  children: React.ReactNode;
}

export default function LikersPopover({ vibelogId, likeCount, children }: LikersPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch likers when popover opens (only if not already loaded)
  useEffect(() => {
    if (isOpen && !hasLoaded && likeCount > 0) {
      setIsLoading(true);
      fetch(`/api/like-vibelog/${vibelogId}/users`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Failed to fetch likers');
        })
        .then(data => {
          setLikers(data.likers || []);
          setHasLoaded(true);
        })
        .catch(err => {
          console.error('Error fetching likers:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, hasLoaded, vibelogId, likeCount]);

  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only show on desktop (hover devices) and if there are likes
    if (likeCount > 0 && window.matchMedia('(hover: hover)').matches) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    // Delay closing to allow mouse to move to popover
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    // On mobile (non-hover devices), toggle on click
    if (likeCount > 0 && !window.matchMedia('(hover: hover)').matches) {
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  // Don't show popover if no likes
  if (likeCount === 0) {
    return <>{children}</>;
  }

  return (
    <div
      ref={popoverRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div onClick={handleClick}>{children}</div>

      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border/50 bg-card/95 shadow-xl backdrop-blur-sm"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Arrow */}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-border/50 bg-card/95" />

          <div className="max-h-80 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Liked by {likeCount} {likeCount === 1 ? 'person' : 'people'}
              </h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-electric border-t-transparent" />
              </div>
            ) : likers.length > 0 ? (
              <div className="space-y-2">
                {likers.map(liker => (
                  <Link
                    key={liker.id}
                    href={`/@${liker.username}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-electric/30 to-electric/10">
                      {liker.avatar_url ? (
                        <img
                          src={liker.avatar_url}
                          alt={liker.display_name || liker.username}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-electric">
                          {(liker.display_name || liker.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium text-foreground">
                        {liker.display_name || liker.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">@{liker.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No likers found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
