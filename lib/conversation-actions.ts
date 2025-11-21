import { config } from '@/lib/config';

export interface ConversationDraft {
  title: string;
  fullContent: string;
  teaser: string;
  detectedLanguage?: string;
}

export interface SaveResult {
  vibelogId?: string;
  publicUrl?: string | null;
  message?: string;
}

export interface PublishResult {
  shareUrl?: string;
  content?: string;
  message?: string;
}

function parseTitleFromMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.replace(/^#\s+/, '').trim();
    }
  }

  const firstSentence = markdown.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 5) {
    return firstSentence.length > 120 ? `${firstSentence.slice(0, 117)}...` : firstSentence;
  }

  return 'Untitled Vibelog';
}

function createTeaser(fullContent: string): string {
  const paragraphs = fullContent.split('\n\n').filter(Boolean);
  if (paragraphs.length <= 3 && fullContent.length <= 800) {
    return fullContent;
  }

  let teaser = '';
  for (const paragraph of paragraphs) {
    const next = teaser ? `${teaser}\n\n${paragraph}` : paragraph;
    if (next.length > 800 && teaser.length > 300) {
      break;
    }
    teaser = next;
    if (teaser.length >= 600) {
      break;
    }
  }

  if (teaser.length < 300) {
    const sentences = fullContent.split(/[.!?]+/).filter(Boolean);
    teaser = sentences.slice(0, 4).join('. ') + (sentences.length > 4 ? '...' : '');
  }

  return teaser || fullContent.slice(0, 400);
}

async function parseJSONorThrow(response: Response) {
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Request failed: ${response.status}`);
  }
  if (!response.ok) {
    const message = body?.message || body?.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return body;
}

export async function generateDraftFromPrompt(
  prompt: string,
  options?: { tone?: string; language?: string }
): Promise<ConversationDraft> {
  const res = await fetch('/api/generate-vibelog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcription: prompt,
      tone: options?.tone,
      detectedLanguage: options?.language,
    }),
  });

  const data = await parseJSONorThrow(res);
  const fullContent: string = data.vibelogContent || data.fullContent || '';
  if (!fullContent) {
    throw new Error('No content returned from generator');
  }

  const teaser = data.vibelogTeaser || createTeaser(fullContent);
  const title = parseTitleFromMarkdown(fullContent);

  return {
    title,
    teaser,
    fullContent,
    detectedLanguage: data.originalLanguage,
  };
}

export async function saveDraft(draft: ConversationDraft): Promise<SaveResult> {
  const res = await fetch('/api/save-vibelog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: draft.title,
      content: draft.teaser,
      fullContent: draft.fullContent,
      isTeaser: true,
    }),
  });

  const data = await parseJSONorThrow(res);
  return {
    vibelogId: data.vibelogId,
    publicUrl: data.publicUrl,
    message: data.message,
  };
}

export async function publishToTwitter(vibelogId: string): Promise<PublishResult> {
  const res = await fetch('/api/publish/twitter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vibelogId, format: 'teaser' }),
  });

  const data = await parseJSONorThrow(res);
  return {
    shareUrl: data.shareUrl,
    content: data.content,
    message: 'Share link ready',
  };
}

// Utility to guard against accidental network usage in dev without analytics enabled
export function shouldCaptureMetrics(): boolean {
  return Boolean(config.features.monitoring && config.features.analytics);
}
