'use client';

interface ViewTrackingPixelProps {
  vibelogId: string;
}

export function ViewTrackingPixel({ vibelogId }: ViewTrackingPixelProps) {
  return (
    <img
      src={`/api/track-view/${vibelogId}`}
      alt=""
      width={1}
      height={1}
      style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
    />
  );
}
