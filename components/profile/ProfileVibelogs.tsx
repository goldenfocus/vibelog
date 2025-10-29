import VibelogCard from '@/components/VibelogCard';

interface Vibelog {
  id: string;
  title: string;
  slug: string;
  content: string;
  teaser?: string;
  audio_url?: string;
  audio_duration?: number;
  cover_image_url?: string | null;
  created_at: string;
  published_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  read_time: number;
  word_count: number;
  tags?: string[];
}

export function ProfileVibelogs({
  vibelogs,
  username,
  displayName,
}: {
  vibelogs: Vibelog[];
  username: string;
  displayName: string;
}) {
  // Add author info to each vibelog for the card
  const vibelogsWithAuthor = vibelogs.map(vibelog => ({
    ...vibelog,
    author: {
      username,
      display_name: displayName,
      avatar_url: null,
    },
  }));

  if (vibelogsWithAuthor.length === 0) {
    return (
      <div className="text-center">
        <h3 className="mb-2 text-xl font-semibold">No vibelogs yet</h3>
        <p className="text-muted-foreground">
          {displayName} hasn&apos;t published any vibelogs yet
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Vibelogs</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vibelogsWithAuthor.map(vibelog => (
          <VibelogCard key={vibelog.id} vibelog={vibelog} />
        ))}
      </div>
    </div>
  );
}
