'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export function AppSheet({
  open,
  onOpenChange,
  title = 'Account',
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  children: React.ReactNode;
}) {
  // Hard scroll lock for iOS
  useEffect(() => {
    if (!open) {
      return;
    }
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed right-0 top-0 z-50 h-dvh w-full border-l bg-background shadow-xl focus:outline-none md:w-[420px]"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="sr-only">
                {title} menu options and settings
              </Dialog.Description>
              <Dialog.Close className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-primary/10 text-primary transition-transform hover:bg-primary/20 active:scale-95">
                <X className="h-5 w-5" aria-hidden />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
