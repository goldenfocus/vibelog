import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

export default async function VibeloggedPage({ params }: PageProps) {
  const { username, slug } = await params;

  // Redirect to the main page with the vibelog view
  redirect(`/@${username}/${slug}#vibelog`);
}
