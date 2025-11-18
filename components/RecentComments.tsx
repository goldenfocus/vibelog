'use client';

import { MessageCircle, Mic, User, Video } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface RecentComment {
  id: string;
  content: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  commentator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  vibelog: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    videoUrl: string | null;
    author: {
      username: string;
      displayName: string;
    };
  };
}

export default function RecentComments() {
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentComments = async () => {
      try {
        const response = await fetch('/api/comments/recent?limit=20');
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        } else {
          // API error (likely table doesn't exist yet) - show "coming soon"
          console.log('Comments API not ready yet (expected during migration)');
          setComments([]); // Will show "coming soon" message
        }
      } catch (error) {
        console.error('Error fetching recent comments:', error);
        setComments([]); // Will show "coming soon" message
      } finally {
        setLoading(false);
      }
    };

    fetchRecentComments();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Recent Vibes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="h-4 w-3/4 rounded bg-white/20"></div>
              <div className="mt-2 h-3 w-1/2 rounded bg-white/10"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-electric" />
          <h2 className="text-2xl font-bold text-white">Recent Vibes</h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <p className="text-lg font-medium text-white">Comments will be available soon!</p>
          <p className="text-sm text-gray-400">
            We're setting up the comment system. Check back shortly!
          </p>
        </div>
      </div>
    );
  }

  // Truncate text to 30-90 characters
  const truncateText = (text: string, maxLength: number = 90) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-electric" />
        <h2 className="text-2xl font-bold text-white">Recent Vibes</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comments.map(comment => {
          // Determine comment type and preview
          const isVoice = !!comment.audioUrl;
          const isVideo = !!comment.videoUrl;
          const isText = !!comment.content;
          const hasVibelogMedia = comment.vibelog.coverImageUrl || comment.vibelog.videoUrl;

          return (
            <Link
              key={comment.id}
              href={`/v/${comment.vibelog.id}#comment-${comment.id}`}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all hover:scale-[1.02] hover:border-electric/50 hover:shadow-lg hover:shadow-electric/20"
            >
              {/* Media Preview */}
              {hasVibelogMedia && (
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  {comment.vibelog.videoUrl ? (
                    <div className="relative h-full w-full">
                      <video
                        src={comment.vibelog.videoUrl}
                        className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-80"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="h-8 w-8 text-white/80" />
                      </div>
                    </div>
                  ) : comment.vibelog.coverImageUrl ? (
                    <img
                      src={comment.vibelog.coverImageUrl}
                      alt={comment.vibelog.title}
                      className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-80"
                    />
                  ) : null}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                </div>
              )}

              {/* Content */}
              <div className="space-y-3 p-4">
                {/* Comment Preview */}
                <div className="flex items-start gap-2">
                  {/* Comment type indicator */}
                  {isVideo ? (
                    <Video className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400" />
                  ) : isVoice ? (
                    <Mic className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                  ) : (
                    <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-electric" />
                  )}

                  {/* Comment text */}
                  <p className="text-sm leading-relaxed text-gray-300">
                    {isText && comment.content
                      ? truncateText(comment.content, 90)
                      : isVoice
                        ? '🎤 Voice vibe'
                        : '🎥 Video vibe'}
                  </p>
                </div>

                {/* Commentator */}
                <div className="flex items-center gap-2">
                  {comment.commentator.avatarUrl ? (
                    <img
                      src={comment.commentator.avatarUrl}
                      alt={comment.commentator.displayName}
                      className="h-6 w-6 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-electric/20">
                      <User className="h-3 w-3 text-electric" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-white">
                    {comment.commentator.displayName}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                {/* Original Vibelog Info */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">on</span>
                  <span className="line-clamp-1 text-xs font-medium text-gray-400">
                    {truncateText(comment.vibelog.title, 40)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">by</span>
                  <span className="text-xs font-medium text-electric">
                    {comment.vibelog.author.displayName}
                  </span>
                </div>
              </div>

              {/* Hover effect glow */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-r from-electric/20 to-purple-500/20 blur-sm"></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
