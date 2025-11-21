import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

export default async function OriginalPage({ params }: PageProps) {
  const { username, slug } = await params;

  // Redirect to the main page with the original view
  // The ContentTabs component will handle showing the original tab
  // Note: username already includes @ prefix from the route pattern
  const cleanUsername = username.startsWith('@') ? username : `@${username}`;
  redirect(`/${cleanUsername}/${slug}#original`);
}
