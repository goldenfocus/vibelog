/**
 * Image filter definitions for profile images
 * Maps CSS filters (client preview) to sharp operations (server processing)
 */

export interface ImageFilter {
  id: string;
  name: string;
  description: string;
  // CSS filter for instant client-side preview
  cssFilter: string;
  // Sharp operations for server-side final processing
  sharp: {
    modulate?: {
      brightness?: number;
      saturation?: number;
      hue?: number;
    };
    grayscale?: boolean;
    linear?: {
      a: number;
      b: number;
    };
  } | null;
}

export const IMAGE_FILTERS: ImageFilter[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'No filter',
    cssFilter: 'none',
    sharp: null,
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Warm, nostalgic tones',
    cssFilter: 'sepia(35%) contrast(90%) brightness(95%) saturate(85%)',
    sharp: {
      modulate: {
        brightness: 0.95,
        saturation: 0.85,
        hue: 15,
      },
      linear: {
        a: 0.9,
        b: 0,
      },
    },
  },
  {
    id: 'bw',
    name: 'B&W',
    description: 'Classic black and white',
    cssFilter: 'grayscale(100%) contrast(110%)',
    sharp: {
      grayscale: true,
      linear: {
        a: 1.1,
        b: 0,
      },
    },
  },
  {
    id: 'cool',
    name: 'Cool',
    description: 'Blue, modern vibes',
    cssFilter: 'brightness(105%) contrast(105%) saturate(110%) hue-rotate(-5deg)',
    sharp: {
      modulate: {
        brightness: 1.05,
        saturation: 1.1,
        hue: -5,
      },
      linear: {
        a: 1.05,
        b: 0,
      },
    },
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Golden hour glow',
    cssFilter: 'brightness(105%) contrast(100%) saturate(120%) hue-rotate(5deg)',
    sharp: {
      modulate: {
        brightness: 1.05,
        saturation: 1.2,
        hue: 5,
      },
    },
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Crisp and vivid',
    cssFilter: 'brightness(110%) contrast(115%) saturate(105%)',
    sharp: {
      modulate: {
        brightness: 1.1,
        saturation: 1.05,
      },
      linear: {
        a: 1.15,
        b: 0,
      },
    },
  },
  {
    id: 'fade',
    name: 'Fade',
    description: 'Soft, dreamy look',
    cssFilter: 'brightness(105%) contrast(85%) saturate(75%)',
    sharp: {
      modulate: {
        brightness: 1.05,
        saturation: 0.75,
      },
      linear: {
        a: 0.85,
        b: 10,
      },
    },
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Bold, saturated colors',
    cssFilter: 'brightness(102%) contrast(110%) saturate(140%)',
    sharp: {
      modulate: {
        brightness: 1.02,
        saturation: 1.4,
      },
      linear: {
        a: 1.1,
        b: 0,
      },
    },
  },
];

/**
 * Get filter by ID
 */
export function getFilterById(id: string): ImageFilter {
  return IMAGE_FILTERS.find(f => f.id === id) || IMAGE_FILTERS[0];
}
