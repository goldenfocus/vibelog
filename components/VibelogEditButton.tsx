'use client';

import { Edit2 } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import VibelogEditModalFull from '@/components/VibelogEditModalFull';

interface VibelogEditButtonProps {
  vibelog: {
    id: string;
    title: string;
    content: string;
    teaser?: string;
    transcript?: string;
    slug: string;
    cover_image_url?: string;
    cover_image_alt?: string;
    user_id: string | null;
  };
}

export default function VibelogEditButton({ vibelog }: VibelogEditButtonProps) {
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Only show edit button if user owns this vibelog
  if (!user || vibelog.user_id !== user.id) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsEditModalOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Edit2 className="h-4 w-4" />
        Edit
      </Button>
      {isEditModalOpen && (
        <VibelogEditModalFull
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          vibelog={vibelog}
        />
      )}
    </>
  );
}
