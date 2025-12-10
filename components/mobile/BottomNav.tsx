'use client';

import { Home, Mic, TrendingUp, MessageCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useBottomNav } from '@/components/providers/BottomNavProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import { useBottomNavVisibility } from '@/hooks/useBottomNavVisibility';
import { useSafeArea } from '@/hooks/useSafeArea';
import { BOTTOM_NAV_HEIGHT, Z_INDEX } from '@/lib/mobile/constants';
import { triggerHaptic } from '@/lib/mobile/haptics';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  ariaLabel: string; // For accessibility when label is empty
  activePattern?: RegExp;
  badge?: number;
}

export interface BottomNavProps {
  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Disable auto-hide on scroll (always visible)
   */
  alwaysVisible?: boolean;

  /**
   * Callback when create button (mic) is tapped
   */
  onCreateClick?: () => void;
}

/**
 * Mobile bottom navigation bar
 * 5 core actions: Home, Create, Vibes, Notifications, Profile
 * Auto-hides on scroll down, shows on scroll up
 * Respects safe-area-inset-bottom for notch/home indicator
 */
export function BottomNav({ className, alwaysVisible = false, onCreateClick }: BottomNavProps) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const { user } = useAuth();
  const { bottom } = useSafeArea();
  const { isVisible } = useBottomNavVisibility();
  const { isHidden: isHiddenByContext } = useBottomNav();
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = await response.json();
          const totalUnread =
            data.conversations?.reduce(
              (sum: number, conv: { unread_count?: number }) => sum + (conv.unread_count || 0),
              0
            ) || 0;
          setUnreadMessages(totalUnread);
        }
      } catch {
        // Silently fail - badge is not critical
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Show navigation if alwaysVisible prop or auto-hide logic, but respect context hide
  const shouldShow = !isHiddenByContext && (alwaysVisible || isVisible);

  // Base nav items for all users
  // Only Create button has a label - others are icon-only for visual peace
  const baseNavItems: NavItem[] = [
    {
      href: `/${locale}`,
      icon: Home,
      label: '', // No label - icon only
      ariaLabel: 'Home',
      activePattern: new RegExp(`^/${locale}/?$`),
    },
    {
      href: `/${locale}/community`,
      icon: TrendingUp,
      label: '', // No label - icon only
      ariaLabel: 'Discover',
      activePattern: new RegExp(`^/${locale}/community`),
    },
    {
      href: onCreateClick ? '#' : `/${locale}`,
      icon: Mic,
      label: 'Create', // Only Create keeps its label
      ariaLabel: 'Create',
      // Create button is special - always highlighted
    },
  ];

  // Additional items only for logged-in users
  // Order: People (community/followers), then Messages (far right for thumb access)
  const authNavItems: NavItem[] = [
    {
      href: `/${locale}/people`,
      icon: Users,
      label: '', // No label - icon only
      ariaLabel: 'People',
      activePattern: new RegExp(`^/${locale}/people`),
    },
    {
      href: `/${locale}/messages`,
      icon: MessageCircle,
      label: '', // No label - icon only
      ariaLabel: 'Messages',
      activePattern: new RegExp(`^/${locale}/messages`),
      badge: unreadMessages,
    },
  ];

  // Only show Messages and You tabs when logged in
  const navItems = user ? [...baseNavItems, ...authNavItems] : baseNavItems;

  const isActive = (item: NavItem) => {
    // Create button has special styling
    if (item.icon === Mic) {
      return false;
    }

    if (item.activePattern) {
      return item.activePattern.test(pathname);
    }
    return pathname === item.href;
  };

  const handleNavClick = (item: NavItem) => {
    // Haptic feedback on tap
    triggerHaptic('LIGHT');

    // Special handling for Create button
    if (item.icon === Mic && onCreateClick) {
      onCreateClick();
    }
  };

  return (
    <nav
      className={cn(
        // Base styles
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background/80 backdrop-blur-xl',
        'border-t border-border/50',

        // Shadow for depth
        'shadow-[0_-4px_24px_rgba(0,0,0,0.08)]',

        // Transition for auto-hide
        'transform transition-transform duration-300 ease-in-out',
        shouldShow ? 'translate-y-0' : 'translate-y-full',

        className
      )}
      style={{
        paddingBottom: bottom,
        zIndex: Z_INDEX.BOTTOM_NAV,
      }}
    >
      {/* Active indicator bar (slides under active item) */}
      <div
        className="absolute left-0 top-0 h-1 bg-primary transition-all duration-300 ease-out"
        style={{
          width: `${100 / navItems.length}%`,
          transform: `translateX(${navItems.findIndex(item => isActive(item)) * 100}%)`,
        }}
      />

      <div
        className="mx-auto flex max-w-screen-xl items-center justify-around"
        style={{
          height: BOTTOM_NAV_HEIGHT.BASE,
        }}
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item);
          const isCreateButton = item.icon === Mic;

          if (onCreateClick && isCreateButton) {
            // Create button with custom onClick
            return (
              <button
                key={item.ariaLabel}
                onClick={() => handleNavClick(item)}
                className={cn(
                  // Base button styles
                  'flex flex-col items-center justify-center gap-0.5',
                  'relative flex-1',
                  'touch-manipulation active:scale-95',
                  'transition-all duration-200',

                  // Create button is special (highlighted)
                  isCreateButton && 'text-primary'
                )}
                aria-label={item.ariaLabel}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    'relative flex items-center justify-center rounded-full transition-all',

                    // Create button gets special treatment
                    isCreateButton
                      ? ['h-11 w-11', 'bg-primary/15', 'ring-2 ring-primary/30']
                      : ['h-10 w-10', active && 'bg-primary/10']
                  )}
                >
                  <Icon
                    className={cn(
                      'transition-colors',
                      isCreateButton
                        ? 'h-5 w-5 text-primary'
                        : active
                          ? 'h-5 w-5 text-primary'
                          : 'h-5 w-5 text-muted-foreground'
                    )}
                  />
                  {/* Badge for unread count */}
                  {item.badge > 0 && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-electric text-[10px] font-bold text-white shadow-lg shadow-electric/40 duration-200 animate-in zoom-in-50">
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </div>

                {/* Label - only show if label exists */}
                {item.label && (
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors',
                      isCreateButton
                        ? 'text-primary'
                        : active
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                )}

                {/* Active indicator dot */}
                {active && !isCreateButton && (
                  <div className="absolute -top-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          }

          // Regular nav link
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleNavClick(item)}
              className={cn(
                // Base link styles
                'flex flex-col items-center justify-center gap-0.5',
                'relative flex-1',
                'touch-manipulation active:scale-95',
                'transition-all duration-200',

                // Create button is special (highlighted)
                isCreateButton && 'text-primary'
              )}
              aria-label={item.ariaLabel}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon container */}
              <div
                className={cn(
                  'relative flex items-center justify-center rounded-full transition-all',

                  // Create button gets special treatment
                  isCreateButton
                    ? ['h-11 w-11', 'bg-primary/15', 'ring-2 ring-primary/30']
                    : ['h-10 w-10', active && 'bg-primary/10']
                )}
              >
                <Icon
                  className={cn(
                    'transition-colors',
                    isCreateButton
                      ? 'h-5 w-5 text-primary'
                      : active
                        ? 'h-5 w-5 text-primary'
                        : 'h-5 w-5 text-muted-foreground'
                  )}
                />
                {/* Badge for unread count */}
                {item.badge > 0 && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-electric text-[10px] font-bold text-white shadow-lg shadow-electric/40 duration-200 animate-in zoom-in-50">
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>

              {/* Label - only show if label exists */}
              {item.label && (
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isCreateButton
                      ? 'text-primary'
                      : active
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              )}

              {/* Active indicator dot */}
              {active && !isCreateButton && (
                <div className="absolute -top-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
