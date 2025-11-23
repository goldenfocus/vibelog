'use client';

import { LucideIcon } from 'lucide-react';

import { useSafeArea } from '@/hooks/useSafeArea';
import { TOUCH_TARGETS } from '@/lib/mobile/constants';
import { triggerHaptic } from '@/lib/mobile/haptics';
import { cn } from '@/lib/utils';

export interface ActionBarAction {
  /**
   * Unique identifier for the action
   */
  id: string;

  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;

  /**
   * Label text (shown below icon)
   */
  label: string;

  /**
   * Click handler
   */
  onClick: () => void;

  /**
   * Variant styling
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'destructive';

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Loading state (shows spinner)
   */
  loading?: boolean;

  /**
   * Badge count (like notifications)
   */
  badge?: number;
}

export interface ActionBarProps {
  /**
   * Array of actions to display
   */
  actions: ActionBarAction[];

  /**
   * Custom className for container
   */
  className?: string;

  /**
   * Layout direction
   * @default 'horizontal'
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Enable haptic feedback on tap
   * @default true
   */
  hapticFeedback?: boolean;
}

/**
 * Reusable action bar component
 * Displays a row of touch-optimized action buttons
 * Used by recording controls, player controls, etc.
 *
 * @example
 * <ActionBar
 *   actions={[
 *     { id: 'cancel', icon: X, label: 'Cancel', onClick: handleCancel, variant: 'destructive' },
 *     { id: 'pause', icon: Pause, label: 'Pause', onClick: handlePause },
 *     { id: 'done', icon: Check, label: 'Done', onClick: handleDone, variant: 'primary' },
 *   ]}
 * />
 */
export function ActionBar({
  actions,
  className,
  layout = 'horizontal',
  hapticFeedback = true,
}: ActionBarProps) {
  const { bottom } = useSafeArea();

  const handleActionClick = (action: ActionBarAction) => {
    if (action.disabled || action.loading) {
      return;
    }

    // Haptic feedback
    if (hapticFeedback) {
      const hapticType = action.variant === 'destructive' ? 'MEDIUM' : 'LIGHT';
      triggerHaptic(hapticType);
    }

    action.onClick();
  };

  return (
    <div
      className={cn(
        'flex gap-4',
        layout === 'horizontal' ? 'flex-row items-center justify-around' : 'flex-col items-stretch',
        className
      )}
      style={{
        paddingBottom: layout === 'horizontal' ? bottom : undefined,
      }}
    >
      {actions.map(action => {
        const Icon = action.icon;

        return (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={action.disabled || action.loading}
            className={cn(
              // Base button styles
              'relative flex flex-col items-center justify-center gap-2',
              'touch-manipulation active:scale-95',
              'transition-all duration-200',
              'rounded-2xl',

              // Size
              layout === 'horizontal' ? 'min-w-0 flex-1 p-4' : 'w-full py-4',

              // Variant colors
              action.variant === 'primary' && [
                'bg-primary/10 text-primary',
                'hover:bg-primary/20',
                'disabled:bg-muted disabled:text-muted-foreground',
              ],
              action.variant === 'destructive' && [
                'bg-destructive/10 text-destructive',
                'hover:bg-destructive/20',
                'disabled:bg-muted disabled:text-muted-foreground',
              ],
              (!action.variant || action.variant === 'default') && [
                'bg-muted/50 text-foreground',
                'hover:bg-muted',
                'disabled:bg-muted/30 disabled:text-muted-foreground',
              ],

              // Disabled state
              action.disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-label={action.label}
            aria-disabled={action.disabled || action.loading}
          >
            {/* Icon container */}
            <div
              className={cn(
                'relative flex items-center justify-center rounded-full',
                'transition-all'
              )}
              style={{
                width: TOUCH_TARGETS.COMFORTABLE,
                height: TOUCH_TARGETS.COMFORTABLE,
              }}
            >
              {action.loading ? (
                // Loading spinner
                <div
                  className={cn(
                    'h-6 w-6 animate-spin rounded-full',
                    'border-2 border-current border-t-transparent'
                  )}
                  aria-label="Loading"
                />
              ) : (
                <>
                  <Icon className="h-6 w-6" />

                  {/* Badge */}
                  {action.badge !== undefined && action.badge > 0 && (
                    <div
                      className={cn(
                        'absolute -right-1 -top-1',
                        'flex items-center justify-center',
                        'h-5 min-w-5 px-1',
                        'rounded-full',
                        'bg-primary text-primary-foreground',
                        'text-xs font-bold'
                      )}
                    >
                      {action.badge > 99 ? '99+' : action.badge}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-sm font-medium',
                'transition-colors',
                layout === 'horizontal' && 'max-w-full truncate'
              )}
            >
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
