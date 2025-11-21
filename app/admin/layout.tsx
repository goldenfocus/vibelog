import { Shield, Users, FileText, Settings, LayoutDashboard, Brain } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isAdmin } from '@/lib/auth-admin';
import { createServerSupabaseClient } from '@/lib/supabase';

export const metadata = {
  title: 'Admin Panel - Vibelog',
  description: 'Administrative dashboard for Vibelog',
};

// Force dynamic rendering to avoid caching admin checks
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function AdminSidebar({ currentPath }: { currentPath?: string }) {
  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: Users,
    },
    {
      href: '/admin/vibelogs',
      label: 'Vibelogs',
      icon: FileText,
    },
    {
      href: '/admin/config',
      label: 'Configuration',
      icon: Settings,
    },
    {
      href: '/admin/vibe-brain',
      label: 'Vibe Brain',
      icon: Brain,
    },
  ];

  return (
    <aside className="w-64 border-r border-border bg-muted/30 p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 p-2">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
      </div>

      <nav className="space-y-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.exact
            ? currentPath === item.href
            : currentPath?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          All actions are logged for security and compliance purposes.
        </p>
      </div>
    </aside>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Check if user is authenticated and is admin
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
