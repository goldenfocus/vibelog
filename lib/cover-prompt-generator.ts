/**
 * Intelligent Cover Image Prompt Generator
 *
 * Analyzes content to select the perfect art style and generates
 * rich, detailed prompts for DALL-E 3 to create masterpiece covers.
 *
 * DALL-E 3 charges per image, not prompt length - so we maximize detail!
 */

// ============================================================================
// ART STYLE LIBRARY - 30+ distinct visual styles
// ============================================================================

interface ArtStyle {
  name: string;
  description: string;
  keywords: string[]; // Content keywords that match this style
  tones: string[]; // Emotional tones that match
  prompt: string; // Detailed style instructions
}

const ART_STYLES: ArtStyle[] = [
  // EPIC & CINEMATIC
  {
    name: 'Cinematic Golden Hour',
    description: 'Epic, dramatic lighting with warm golden tones',
    keywords: ['journey', 'growth', 'life', 'hope', 'dream', 'future', 'success', 'achievement'],
    tones: ['inspirational', 'hopeful', 'motivational', 'uplifting'],
    prompt: `Style: Cinematic masterpiece with dramatic golden hour lighting.
Atmosphere: Epic, awe-inspiring, emotionally resonant like a movie poster.
Colors: Rich golds, warm ambers, deep magentas bleeding into purple twilight skies.
Lighting: Volumetric god rays piercing through clouds, lens flares, dramatic backlighting.
Composition: Grand scale, rule of thirds, leading lines toward a focal point.
Quality: 8K photorealistic render, hyperdetailed, cinematic color grading.
Mood: The feeling of standing at the precipice of something magnificent.`,
  },
  {
    name: 'Ethereal Dreamscape',
    description: 'Soft, mystical, otherworldly atmosphere',
    keywords: ['dream', 'memory', 'soul', 'spirit', 'inner', 'meditation', 'peace', 'calm'],
    tones: ['reflective', 'peaceful', 'spiritual', 'contemplative'],
    prompt: `Style: Ethereal dreamscape with soft, diffused lighting.
Atmosphere: Mystical, otherworldly, like a lucid dream made visible.
Colors: Soft pastels - lavender, rose gold, pearl white, seafoam, blush pink.
Lighting: Soft glow emanating from within, bioluminescent elements, aurora-like.
Textures: Flowing fabrics, mist, particles of light, translucent layers.
Composition: Floating elements, impossible architecture, dreamlike perspective.
Quality: Painterly photorealism, soft focus edges, magical realism.
Mood: The space between waking and sleeping, where anything is possible.`,
  },
  {
    name: 'Noir Cinematic',
    description: 'High contrast black and white with dramatic shadows',
    keywords: ['dark', 'mystery', 'truth', 'secret', 'shadow', 'hidden', 'night', 'struggle'],
    tones: ['mysterious', 'introspective', 'serious', 'deep'],
    prompt: `Style: Film noir cinematic with high contrast lighting.
Atmosphere: Mysterious, moody, reminiscent of classic detective films.
Colors: Deep blacks, stark whites, subtle hints of one accent color (red or blue).
Lighting: Single harsh light source, long dramatic shadows, chiaroscuro effect.
Textures: Rain-slicked surfaces, smoke, venetian blind shadows, reflections.
Composition: Dutch angles, strong geometric shapes, isolated figures.
Quality: High contrast black and white photography, film grain texture.
Mood: The weight of unspoken truths and the beauty in darkness.`,
  },

  // ARTISTIC & PAINTERLY
  {
    name: 'Impressionist Monet',
    description: 'Soft brushstrokes capturing light and emotion',
    keywords: ['nature', 'garden', 'water', 'light', 'moment', 'beauty', 'simple', 'peaceful'],
    tones: ['serene', 'nostalgic', 'gentle', 'appreciative'],
    prompt: `Style: French Impressionism inspired by Claude Monet.
Technique: Visible brushstrokes, dappled light, color applied in layers.
Colors: Soft blues, gentle greens, warm yellows, purple shadows, pink highlights.
Lighting: Natural daylight, reflections on water, light filtering through leaves.
Subject: Gardens, water lilies, bridges, natural scenes, figures in landscapes.
Composition: Soft edges, atmospheric perspective, focus on light over detail.
Quality: Oil painting texture, museum-quality fine art reproduction.
Mood: The fleeting beauty of a moment preserved in color and light.`,
  },
  {
    name: 'Watercolor Organic',
    description: 'Fluid, flowing watercolor with organic shapes',
    keywords: ['emotion', 'feeling', 'heart', 'love', 'connection', 'relationship', 'care'],
    tones: ['emotional', 'tender', 'heartfelt', 'vulnerable'],
    prompt: `Style: Expressive watercolor painting with organic flowing forms.
Technique: Wet-on-wet blending, controlled bleeds, white space breathing room.
Colors: Vibrant yet soft - coral, turquoise, golden yellow, deep indigo accents.
Textures: Paper grain visible, paint pooling in beautiful accidents, salt effects.
Composition: Abstract elements merging with recognizable forms, negative space.
Movement: Flowing, like emotions made visible, ink dispersing in water.
Quality: Fine art watercolor on cold-pressed paper, gallery exhibition quality.
Mood: Raw emotion captured in pigment and water, honest and beautiful.`,
  },
  {
    name: 'Renaissance Classical',
    description: 'Timeless classical painting with rich detail',
    keywords: ['wisdom', 'knowledge', 'history', 'human', 'philosophy', 'truth', 'legacy'],
    tones: ['profound', 'wise', 'timeless', 'philosophical'],
    prompt: `Style: Renaissance masterpiece in the tradition of great masters.
Technique: Sfumato, glazing layers, meticulous attention to form and anatomy.
Colors: Rich earth tones, ultramarine blue, vermillion, gold leaf accents.
Lighting: Dramatic chiaroscuro, single window light source, glowing skin tones.
Composition: Classical proportions, triangular arrangements, symbolic elements.
Details: Intricate fabric textures, realistic hands, meaningful background elements.
Quality: Museum masterpiece quality, the look of centuries-old oil on canvas.
Mood: Timeless human truths rendered with technical mastery and deep meaning.`,
  },
  {
    name: 'Abstract Expressionist',
    description: 'Bold, gestural, emotionally raw abstraction',
    keywords: ['chaos', 'energy', 'passion', 'intensity', 'raw', 'freedom', 'expression'],
    tones: ['intense', 'passionate', 'energetic', 'raw'],
    prompt: `Style: Abstract Expressionism inspired by Pollock and de Kooning.
Technique: Gestural brushwork, drips, splatters, physical paint application.
Colors: Bold primaries, deep blacks, stark whites, unexpected color clashes.
Energy: Visible artist's hand, movement frozen in paint, controlled chaos.
Composition: All-over composition, no single focal point, immersive scale.
Texture: Thick impasto, layered paint, visible brush and palette knife marks.
Quality: Large-scale contemporary art museum piece, commanding presence.
Mood: Pure emotion externalized, the artist's psyche made visible.`,
  },
  {
    name: 'Art Nouveau',
    description: 'Elegant flowing lines with natural motifs',
    keywords: ['beauty', 'elegant', 'natural', 'woman', 'feminine', 'grace', 'art', 'style'],
    tones: ['elegant', 'graceful', 'artistic', 'refined'],
    prompt: `Style: Art Nouveau in the tradition of Alphonse Mucha.
Elements: Flowing organic lines, natural motifs, decorative borders.
Colors: Muted earth tones with gold accents, soft greens, dusty pinks, cream.
Composition: Central figure with elaborate decorative framing, symmetrical.
Motifs: Flowers, flowing hair, peacock feathers, celtic knots, botanical elements.
Typography area: Leave elegant space for potential text integration.
Quality: Vintage lithograph poster aesthetic, museum reproduction quality.
Mood: The marriage of beauty and function, nature elevated to high art.`,
  },

  // MODERN & CONTEMPORARY
  {
    name: 'Bold Geometric',
    description: 'Clean shapes, vibrant colors, modern design',
    keywords: ['tech', 'data', 'system', 'process', 'build', 'create', 'design', 'modern'],
    tones: ['analytical', 'structured', 'professional', 'modern'],
    prompt: `Style: Contemporary geometric abstraction with bold shapes.
Elements: Clean geometric forms - circles, triangles, rectangles, polygons.
Colors: Vibrant saturated hues - electric blue, hot pink, lime green, orange.
Composition: Layered shapes, intentional overlaps, dynamic balance.
Depth: 3D effects, shadows, floating elements, isometric perspective.
Texture: Smooth gradients, subtle grain, glass-like transparency effects.
Quality: Vector-sharp precision, modern graphic design aesthetic.
Mood: The clarity of organized thought, complexity made visually elegant.`,
  },
  {
    name: 'Minimalist Scandinavian',
    description: 'Clean, simple, thoughtful negative space',
    keywords: ['simple', 'focus', 'clarity', 'essential', 'minimal', 'clean', 'pure'],
    tones: ['focused', 'calm', 'clear', 'intentional'],
    prompt: `Style: Scandinavian minimalism with intentional simplicity.
Philosophy: Less is more - every element must earn its place.
Colors: Muted palette - warm whites, soft grays, natural wood tones, one accent.
Composition: Generous negative space, single focal element, perfect balance.
Elements: Simple geometric shapes, natural materials, organic curves.
Lighting: Soft, even, diffused - like Nordic winter daylight.
Quality: High-end interior design photography, hygge aesthetic.
Mood: The profound peace of simplicity, space to breathe and think.`,
  },
  {
    name: 'Cyberpunk Neon',
    description: 'Futuristic neon-lit urban dystopia',
    keywords: ['future', 'tech', 'digital', 'ai', 'machine', 'cyber', 'virtual', 'online'],
    tones: ['futuristic', 'edgy', 'technological', 'innovative'],
    prompt: `Style: Cyberpunk aesthetic with neon-drenched atmosphere.
Setting: Rain-soaked future city, holographic advertisements, dense urban.
Colors: Electric neons - hot pink, cyan, purple - against deep blacks.
Lighting: Multiple neon sources, reflections on wet surfaces, volumetric fog.
Elements: Holographic interfaces, chrome, glass, steam, flying vehicles.
Composition: Dense visual information, vertical cityscape, human scale contrast.
Quality: Hyper-detailed digital art, Blade Runner meets Ghost in the Shell.
Mood: The beautiful chaos of a high-tech future, humanity among the machines.`,
  },
  {
    name: 'Vaporwave Aesthetic',
    description: 'Retro-futuristic 80s nostalgia',
    keywords: ['retro', 'nostalgia', 'memory', 'past', 'old', 'vintage', 'classic'],
    tones: ['nostalgic', 'playful', 'ironic', 'dreamy'],
    prompt: `Style: Vaporwave aesthetic with retro-futuristic elements.
Era: 1980s-90s nostalgia filtered through digital abstraction.
Colors: Pink and cyan gradients, purple sunsets, chrome silver.
Elements: Greek statues, palm trees, grid floors, retro computers, VHS glitches.
Textures: Scan lines, chromatic aberration, holographic, marble.
Composition: Surreal juxtapositions, infinite grids, floating objects.
Quality: Digital collage aesthetic, intentionally low-fi yet sophisticated.
Mood: Melancholic nostalgia for a future that never was.`,
  },

  // CULTURAL & TRADITIONAL
  {
    name: 'Japanese Ukiyo-e',
    description: 'Traditional Japanese woodblock print style',
    keywords: ['zen', 'balance', 'nature', 'wave', 'mountain', 'flow', 'path', 'journey'],
    tones: ['zen', 'balanced', 'harmonious', 'contemplative'],
    prompt: `Style: Traditional Japanese ukiyo-e woodblock print.
Technique: Bold outlines, flat color areas, no perspective shading.
Colors: Limited palette - indigo, vermillion, ochre, sage green, white.
Composition: Asymmetrical balance, elements cut by frame edges, layered planes.
Subjects: Great waves, Mount Fuji, natural elements, seasonal themes.
Details: Fine line patterns for texture, decorative clouds, stylized water.
Quality: Museum-quality reproduction of Edo period masterwork.
Mood: The profound beauty in nature's power and humanity's small place within it.`,
  },
  {
    name: 'Studio Ghibli Inspired',
    description: 'Whimsical, detailed anime-style landscapes',
    keywords: ['magic', 'wonder', 'adventure', 'nature', 'spirit', 'childhood', 'imagination'],
    tones: ['whimsical', 'magical', 'innocent', 'adventurous'],
    prompt: `Style: Animation art inspired by Studio Ghibli aesthetic.
Atmosphere: Magical realism where wonder exists in everyday moments.
Colors: Lush greens, sky blues, warm sunset oranges, soft cloud whites.
Details: Intricate background scenery, moving clouds, detailed foliage.
Elements: Cozy cottages, ancient forests, gentle spirits, flying machines.
Lighting: Golden hour warmth, dramatic cloud formations, magical glows.
Quality: Film-quality animation background, hand-painted aesthetic.
Mood: The magic hiding in plain sight, childhood wonder remembered.`,
  },

  // SURREAL & EXPERIMENTAL
  {
    name: 'Surrealist Dalí',
    description: 'Dreamlike impossibilities, melting reality',
    keywords: ['strange', 'weird', 'dream', 'mind', 'subconscious', 'abstract', 'think'],
    tones: ['surreal', 'thought-provoking', 'bizarre', 'imaginative'],
    prompt: `Style: Surrealism inspired by Salvador Dalí and René Magritte.
Reality: Impossible physics, melting objects, dream logic made visible.
Colors: Desert ochres, clear blue skies, stark shadows, precise rendering.
Elements: Melting clocks, elephants on stilts, floating objects, infinite deserts.
Technique: Hyperrealistic rendering of impossible subjects.
Composition: Deep perspective, vast empty spaces, tiny figures for scale.
Quality: Museum-quality oil painting, photorealistic impossible scenes.
Mood: The landscape of the subconscious, logic suspended, wonder engaged.`,
  },
  {
    name: 'Biopunk Organic-Tech',
    description: 'Fusion of biological and technological',
    keywords: ['body', 'health', 'biology', 'organic', 'grow', 'evolve', 'transform'],
    tones: ['transformative', 'organic', 'evolutionary', 'complex'],
    prompt: `Style: Biopunk aesthetic merging organic and technological.
Fusion: Living tissue integrated with circuits, organic machines, grown tech.
Colors: Bioluminescent greens and blues, flesh tones, metallic accents.
Textures: Cellular patterns, circuit boards, coral-like growths, membrane.
Elements: Neural networks made visible, DNA helices, symbiotic structures.
Lighting: Internal bioluminescence, medical imaging aesthetic.
Quality: Scientific illustration meets concept art, detailed and plausible.
Mood: The future where technology and biology become indistinguishable.`,
  },

  // NATURE & ENVIRONMENT
  {
    name: 'Cosmic Nebula',
    description: 'Deep space imagery with cosmic scale',
    keywords: ['universe', 'space', 'infinite', 'cosmos', 'star', 'big', 'vast', 'beyond'],
    tones: ['expansive', 'cosmic', 'awe-inspiring', 'transcendent'],
    prompt: `Style: Deep space photography and cosmic nebula imagery.
Scale: Unfathomable cosmic distances, galaxies, nebulae, star fields.
Colors: Deep space purples, nebula pinks, stellar blues, cosmic dust gold.
Elements: Spiral galaxies, stellar nurseries, planetary nebulae, supernovae.
Composition: Vast emptiness punctuated by intense light, sense of scale.
Details: Countless stars, gas clouds, cosmic dust lanes, gravitational lensing.
Quality: Hubble telescope meets artistic interpretation, awe-inspiring.
Mood: The humbling vastness of existence, our small but significant place.`,
  },
  {
    name: 'Botanical Illustration',
    description: 'Scientific yet artistic plant studies',
    keywords: ['nature', 'plant', 'garden', 'grow', 'bloom', 'organic', 'natural', 'earth'],
    tones: ['natural', 'grounded', 'detailed', 'appreciative'],
    prompt: `Style: Victorian botanical illustration with scientific precision.
Technique: Detailed observation, accurate proportions, elegant arrangement.
Colors: Natural greens, delicate flower colors, cream paper background.
Elements: Flowering plants, roots, seeds, cross-sections, life cycle stages.
Composition: Central specimen with detail studies, elegant layout.
Details: Intricate leaf veins, petal textures, botanical accuracy.
Quality: Museum natural history collection, hand-painted watercolor.
Mood: The profound complexity hidden in every living thing.`,
  },
  {
    name: 'Underwater Realm',
    description: 'Deep ocean mystery and bioluminescence',
    keywords: ['deep', 'beneath', 'hidden', 'explore', 'discover', 'unknown', 'below'],
    tones: ['mysterious', 'exploratory', 'hidden', 'deep'],
    prompt: `Style: Deep ocean realm with bioluminescent life forms.
Depth: Abyssal zone where sunlight never reaches, alien world.
Colors: Deep blues and blacks with bioluminescent glows - greens, blues, reds.
Creatures: Jellyfish, anglerfish, giant squid, fantastic undiscovered species.
Lighting: Only bioluminescence, points of light in infinite darkness.
Atmosphere: Pressure, mystery, the unknown depths of inner and outer worlds.
Quality: National Geographic meets fantasy art, scientifically inspired.
Mood: The vast unknown that exists beneath the surface of everything.`,
  },

  // PORTRAIT & HUMAN
  {
    name: 'Baroque Dramatic',
    description: 'Intense dramatic lighting, rich textures',
    keywords: ['struggle', 'triumph', 'hero', 'battle', 'overcome', 'power', 'strength'],
    tones: ['dramatic', 'powerful', 'triumphant', 'intense'],
    prompt: `Style: Baroque painting with dramatic Caravaggio lighting.
Drama: Intense moments frozen in time, theatrical composition.
Colors: Deep blacks, rich reds and golds, flesh tones glowing against dark.
Lighting: Single dramatic light source, extreme chiaroscuro, spotlight effect.
Composition: Diagonal movement, reaching hands, fabric in motion.
Emotion: Visible on faces, captured at the peak moment of action.
Quality: Old master museum piece, centuries of artistic tradition.
Mood: The eternal human drama of struggle, passion, and transcendence.`,
  },
  {
    name: 'Pop Art Warhol',
    description: 'Bold colors, repeated patterns, commercial art',
    keywords: ['popular', 'culture', 'media', 'social', 'trend', 'famous', 'icon'],
    tones: ['playful', 'bold', 'cultural', 'contemporary'],
    prompt: `Style: Pop Art in the tradition of Andy Warhol and Roy Lichtenstein.
Technique: Bold outlines, flat colors, Ben-Day dots, screen print aesthetic.
Colors: Saturated primaries, unexpected combinations, neon accents.
Composition: Repeated images with color variations, grid layouts.
Elements: Commercial imagery elevated to art, celebrity culture, consumer goods.
Irony: Commentary through repetition and color, surface as depth.
Quality: Museum-quality silkscreen reproduction aesthetic.
Mood: The beautiful banality of consumer culture, irony and appreciation.`,
  },

  // ATMOSPHERIC & MOOD
  {
    name: 'Misty Morning',
    description: 'Soft atmospheric fog, peaceful dawn',
    keywords: ['morning', 'begin', 'start', 'new', 'fresh', 'dawn', 'awake', 'rise'],
    tones: ['hopeful', 'fresh', 'beginning', 'quiet'],
    prompt: `Style: Atmospheric landscape photography at dawn.
Time: The magical hour when night becomes day, world half-asleep.
Colors: Soft grays, pale pinks, muted blues, silver mist, golden sun hints.
Atmosphere: Dense fog softening all edges, layered depth, mystery.
Elements: Silhouetted trees, distant hills, water reflections, birds in flight.
Lighting: Diffused, soft, the sun a pale disk through mist.
Quality: Fine art landscape photography, large format camera aesthetic.
Mood: The pregnant possibility of a new beginning, world made fresh.`,
  },
  {
    name: 'Storm Dramatic',
    description: 'Powerful weather, dramatic skies',
    keywords: ['change', 'storm', 'challenge', 'difficult', 'crisis', 'turning', 'moment'],
    tones: ['challenging', 'transformative', 'powerful', 'turbulent'],
    prompt: `Style: Dramatic storm photography with epic atmospheric conditions.
Weather: Supercell thunderstorms, tornado formations, dramatic cloud structures.
Colors: Dark purples, ominous greens, lightning whites, rain-gray.
Lighting: Lightning illuminating clouds from within, shaft of light breaking through.
Composition: Vast sky dominating, small human elements for scale.
Drama: The moment before or after the storm breaks, maximum tension.
Quality: National Geographic storm chaser photography, dramatic timing.
Mood: The transformative power of nature, destruction and renewal.`,
  },
  {
    name: 'Autumn Warmth',
    description: 'Rich fall colors, cozy atmosphere',
    keywords: ['change', 'season', 'time', 'pass', 'reflect', 'memory', 'warm', 'comfort'],
    tones: ['warm', 'nostalgic', 'reflective', 'comfortable'],
    prompt: `Style: Autumn landscape with rich warm tones and cozy atmosphere.
Season: Peak fall foliage, the last warmth before winter.
Colors: Burnt oranges, deep reds, golden yellows, warm browns, forest green.
Elements: Falling leaves, misty mornings, harvest themes, warm light.
Lighting: Golden hour extended, warm sun through colored leaves.
Atmosphere: Crisp air visible, wood smoke hints, gathering before cold.
Quality: Fine art nature photography, medium format richness.
Mood: The beautiful melancholy of change, finding warmth in transition.`,
  },

  // ARCHITECTURAL & STRUCTURAL
  {
    name: 'Architectural Marvel',
    description: 'Stunning buildings and structural beauty',
    keywords: ['build', 'structure', 'foundation', 'construct', 'design', 'plan', 'create'],
    tones: ['ambitious', 'structured', 'visionary', 'grand'],
    prompt: `Style: Architectural photography showcasing structural beauty.
Subjects: Iconic buildings, impossible architecture, structural poetry.
Colors: Concrete grays, glass reflections, steel blues, warm stone.
Composition: Strong geometric lines, symmetry, dramatic perspectives.
Lighting: Golden hour on facades, interior light at blue hour, contrast.
Details: Textures of materials, human scale figures, reflections.
Quality: Architectural Digest cover quality, large format precision.
Mood: Human ambition made concrete, the poetry of engineered space.`,
  },
  {
    name: 'Ancient Ruins',
    description: 'Historical structures reclaimed by nature',
    keywords: ['history', 'past', 'ancient', 'legacy', 'heritage', 'tradition', 'old'],
    tones: ['historical', 'contemplative', 'reverent', 'timeless'],
    prompt: `Style: Ancient ruins photography with atmospheric lighting.
Setting: Temples, castles, abandoned cities being reclaimed by nature.
Colors: Weathered stone grays, moss greens, golden sunlight, shadow depths.
Elements: Crumbling columns, overgrown stairs, trees growing through stone.
Lighting: Shafts of light through broken roofs, dramatic shadows.
Atmosphere: The weight of centuries, nature's patient reclamation.
Quality: National Geographic archaeological discovery aesthetic.
Mood: The impermanence of human works, beauty in decay and persistence.`,
  },
];

// ============================================================================
// CONTENT ANALYSIS
// ============================================================================

interface ContentAnalysis {
  detectedTones: string[];
  detectedKeywords: string[];
  primaryEmotion: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

function analyzeContent(title: string, teaser?: string, transcript?: string): ContentAnalysis {
  const fullText = `${title} ${teaser || ''} ${transcript || ''}`.toLowerCase();

  // Detect keywords present in content
  const allKeywords = ART_STYLES.flatMap(s => s.keywords);
  const detectedKeywords = [...new Set(allKeywords.filter(kw => fullText.includes(kw)))];

  // Detect tones based on emotional indicators
  const toneIndicators: Record<string, string[]> = {
    inspirational: ['hope', 'dream', 'achieve', 'success', 'overcome', 'inspire', 'believe'],
    emotional: ['feel', 'heart', 'love', 'sad', 'happy', 'emotion', 'cry', 'joy'],
    philosophical: ['think', 'question', 'meaning', 'truth', 'exist', 'purpose', 'why'],
    technical: ['how', 'process', 'system', 'build', 'create', 'code', 'design', 'data'],
    reflective: ['remember', 'past', 'memory', 'look back', 'realize', 'learn', 'grew'],
    adventurous: ['explore', 'discover', 'journey', 'adventure', 'new', 'unknown'],
    peaceful: ['calm', 'peace', 'quiet', 'still', 'rest', 'relax', 'gentle'],
    intense: ['passionate', 'intense', 'powerful', 'strong', 'fierce', 'burning'],
  };

  const detectedTones: string[] = [];
  for (const [tone, indicators] of Object.entries(toneIndicators)) {
    if (indicators.some(ind => fullText.includes(ind))) {
      detectedTones.push(tone);
    }
  }

  // Determine primary emotion
  const primaryEmotion = detectedTones[0] || 'reflective';

  // Assess complexity based on text length
  const wordCount = fullText.split(/\s+/).length;
  const complexity = wordCount < 100 ? 'simple' : wordCount < 500 ? 'moderate' : 'complex';

  return { detectedTones, detectedKeywords, primaryEmotion, complexity };
}

// ============================================================================
// STYLE SELECTION
// ============================================================================

function selectBestStyle(analysis: ContentAnalysis): ArtStyle {
  // Score each style based on keyword and tone matches
  const scores = ART_STYLES.map(style => {
    let score = 0;

    // Keyword matches (weighted heavily)
    for (const keyword of analysis.detectedKeywords) {
      if (style.keywords.includes(keyword)) {
        score += 3;
      }
    }

    // Tone matches
    for (const tone of analysis.detectedTones) {
      if (style.tones.includes(tone)) {
        score += 2;
      }
    }

    // Add some randomness to avoid always picking the same style
    score += Math.random() * 2;

    return { style, score };
  });

  // Sort by score and pick from top 3 for variety
  scores.sort((a, b) => b.score - a.score);
  const topPicks = scores.slice(0, 3);
  const selected = topPicks[Math.floor(Math.random() * topPicks.length)];

  return selected.style;
}

// ============================================================================
// COLOR PALETTE VARIATIONS
// ============================================================================

const COLOR_MOODS = [
  'warm golden tones with amber and honey accents',
  'cool blues and silvers with hints of teal',
  'rich jewel tones - emerald, sapphire, ruby',
  'earth tones - terracotta, sage, ochre, umber',
  'sunset gradient - coral, peach, magenta, purple',
  'monochromatic with one bold accent color',
  'pastel dream palette - lavender, blush, mint',
  'high contrast - deep blacks with vibrant highlights',
  'aurora borealis - greens, purples, pinks dancing',
  'vintage sepia with selective color highlights',
];

const COMPOSITION_VARIATIONS = [
  'centered focal point with symmetrical framing',
  'dynamic diagonal composition with movement',
  'rule of thirds with subject on golden intersection',
  'vast negative space emphasizing isolation',
  'layered depth with foreground, middle, and background elements',
  'frame within frame creating visual depth',
  'leading lines drawing eye to focal point',
  'pattern interrupted by single unique element',
];

const LIGHTING_VARIATIONS = [
  'dramatic side lighting creating deep shadows',
  'soft diffused light like overcast day',
  'backlit silhouette with glowing edges',
  'golden hour warmth with long shadows',
  'blue hour twilight with artificial lights emerging',
  'multiple light sources creating complex shadows',
  'spotlight effect isolating the subject',
  'bioluminescent or internal glow effect',
];

// ============================================================================
// MAIN PROMPT GENERATOR
// ============================================================================

export interface CoverPromptOptions {
  title: string;
  teaser?: string;
  transcript?: string;
  username?: string;
  forceStyle?: string; // Override automatic style selection
}

export interface GeneratedPrompt {
  prompt: string;
  styleName: string;
  analysis: ContentAnalysis;
}

export function generateCoverPrompt(options: CoverPromptOptions): GeneratedPrompt {
  const { title, teaser, transcript, username } = options;

  // Analyze content
  const analysis = analyzeContent(title, teaser, transcript);

  // Select style (or use forced style)
  let selectedStyle: ArtStyle;
  if (options.forceStyle) {
    selectedStyle =
      ART_STYLES.find(s => s.name === options.forceStyle) || selectBestStyle(analysis);
  } else {
    selectedStyle = selectBestStyle(analysis);
  }

  // Random variations for uniqueness
  const colorMood = COLOR_MOODS[Math.floor(Math.random() * COLOR_MOODS.length)];
  const composition =
    COMPOSITION_VARIATIONS[Math.floor(Math.random() * COMPOSITION_VARIATIONS.length)];
  const lighting = LIGHTING_VARIATIONS[Math.floor(Math.random() * LIGHTING_VARIATIONS.length)];

  // Build the mega-prompt
  const contentContext = teaser
    ? `Content theme: "${title}" - ${teaser.substring(0, 200)}`
    : `Content theme: "${title}"`;

  // Branding element (DALL-E struggles with text but worth trying)
  const brandingNote = username
    ? `\n\nBranding: If possible, subtly incorporate "vibelog.io/@${username}" as an elegant watermark in the lower right corner, using a font that matches the artwork style. If text rendering is not possible, leave that area clean.`
    : '';

  const prompt = `Create a masterpiece cover image that would make people stop scrolling and want to share.

${contentContext}

=== PRIMARY STYLE ===
${selectedStyle.prompt}

=== COLOR DIRECTION ===
Color mood for this piece: ${colorMood}

=== COMPOSITION ===
${composition}

=== LIGHTING ===
${lighting}

=== CRITICAL REQUIREMENTS ===
- NO TEXT in the image except optional branding watermark
- Image must work as a vertical card (portrait orientation preferred) AND horizontal banner
- Should evoke emotion and curiosity - make viewers want to know the story
- Must be visually stunning enough to be proud to share on social media
- Professional quality suitable for a premium content platform
- Avoid clichés - create something that feels fresh and artistic${brandingNote}

=== QUALITY ===
Render at maximum quality. This should look like gallery art, not stock photography.
The image should tell a story without words and capture the essence of human expression.`;

  return {
    prompt,
    styleName: selectedStyle.name,
    analysis,
  };
}

// Export style names for reference
export const AVAILABLE_STYLES = ART_STYLES.map(s => s.name);

// Helper to get style description
export function getStyleDescription(styleName: string): string | undefined {
  return ART_STYLES.find(s => s.name === styleName)?.description;
}
