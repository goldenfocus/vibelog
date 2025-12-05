'use client';

import { Plus, Radio } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChannelSummary } from '@/lib/channels/types';
import { cn } from '@/lib/utils';

interface ChannelSelectorProps {
  channels: ChannelSummary[];
  selectedChannelId: string | null;
  onSelect: (channelId: string | null) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * ChannelSelector - Dropdown for selecting which channel to post to
 *
 * Used in the MicRecorder and other posting flows to let users choose
 * which of their channels to publish content to.
 */
export default function ChannelSelector({
  channels,
  selectedChannelId,
  onSelect,
  disabled = false,
  className,
  compact = false,
}: ChannelSelectorProps) {
  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Don't render if user has no channels (shouldn't happen after migration)
  if (channels.length === 0) {
    return null;
  }

  // If user has only one channel, show it as a badge instead of dropdown
  if (channels.length === 1) {
    const channel = channels[0];
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm',
          className
        )}
      >
        {channel.avatar_url ? (
          <Image
            src={channel.avatar_url}
            alt={channel.name}
            width={20}
            height={20}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
            <Radio className="h-3 w-3 text-primary" />
          </div>
        )}
        <span className="font-medium text-foreground">@{channel.handle}</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedChannelId || undefined}
      onValueChange={value => onSelect(value)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'w-auto min-w-[180px] gap-2 border-muted/50 bg-muted/30 hover:bg-muted/50',
          compact && 'h-8 px-2 text-sm',
          className
        )}
      >
        <SelectValue placeholder="Select channel">
          {selectedChannel && (
            <div className="flex items-center gap-2">
              {selectedChannel.avatar_url ? (
                <Image
                  src={selectedChannel.avatar_url}
                  alt={selectedChannel.name}
                  width={compact ? 16 : 20}
                  height={compact ? 16 : 20}
                  className="rounded-full"
                />
              ) : (
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full bg-primary/10',
                    compact ? 'h-4 w-4' : 'h-5 w-5'
                  )}
                >
                  <Radio className={cn('text-primary', compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
                </div>
              )}
              <span className="font-medium">@{selectedChannel.handle}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {channels.map(channel => (
          <SelectItem key={channel.id} value={channel.id} className="cursor-pointer">
            <div className="flex items-center gap-2">
              {channel.avatar_url ? (
                <Image
                  src={channel.avatar_url}
                  alt={channel.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                  <Radio className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-medium">@{channel.handle}</span>
                <span className="text-xs text-muted-foreground">
                  {channel.vibelog_count} vibelogs
                  {channel.is_default && ' • Default'}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}

        {/* Create new channel link */}
        <div className="border-t border-border/50 p-1">
          <Link
            href="/dashboard/channels/new"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" />
            Create new channel
          </Link>
        </div>
      </SelectContent>
    </Select>
  );
}
