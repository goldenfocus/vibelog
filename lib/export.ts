/**
 * Export utilities for converting vibelog content to various formats
 */

export type ExportFormat = 'markdown' | 'html' | 'text' | 'json';

export interface VibelogExportData {
  title?: string;
  content: string;
  author?: string;
  createdAt?: string;
  tags?: string[];
}

/**
 * Convert vibelog content to Markdown format
 */
export function exportAsMarkdown(data: VibelogExportData): string {
  const lines: string[] = [];

  // Title
  if (data.title) {
    lines.push(`# ${data.title}\n`);
  }

  // Metadata
  if (data.author || data.createdAt || data.tags) {
    lines.push('---');
    if (data.author) {
      lines.push(`Author: ${data.author}`);
    }
    if (data.createdAt) {
      lines.push(`Date: ${data.createdAt}`);
    }
    if (data.tags && data.tags.length > 0) {
      lines.push(`Tags: ${data.tags.join(', ')}`);
    }
    lines.push('---\n');
  }

  // Content
  lines.push(data.content);

  return lines.join('\n');
}

/**
 * Convert vibelog content to HTML format
 */
export function exportAsHTML(data: VibelogExportData): string {
  const title = data.title || 'Vibelog';
  const author = data.author || '';
  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Convert markdown-like content to HTML paragraphs
  const contentHtml = data.content
    .split('\n\n')
    .filter(p => p.trim())
    .map(paragraph => `    <p>${escapeHtml(paragraph.trim())}</p>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: #111;
    }
    .meta {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
    }
    p {
      margin-bottom: 1rem;
    }
    .tags {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }
    .tag {
      display: inline-block;
      background: #f0f0f0;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      margin-right: 0.5rem;
      font-size: 0.85rem;
      color: #666;
    }
  </style>
</head>
<body>
  <article>
    <h1>${escapeHtml(title)}</h1>
    ${
      author || date
        ? `<div class="meta">
      ${author ? `<span>By ${escapeHtml(author)}</span>` : ''}
      ${author && date ? ' • ' : ''}
      ${date ? `<span>${date}</span>` : ''}
    </div>`
        : ''
    }
    <div class="content">
${contentHtml}
    </div>
    ${
      data.tags && data.tags.length > 0
        ? `<div class="tags">
      ${data.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
    </div>`
        : ''
    }
  </article>
</body>
</html>`;
}

/**
 * Convert vibelog content to plain text format
 */
export function exportAsText(data: VibelogExportData): string {
  const lines: string[] = [];

  if (data.title) {
    lines.push(data.title.toUpperCase());
    lines.push('='.repeat(data.title.length));
    lines.push('');
  }

  if (data.author) {
    lines.push(`By: ${data.author}`);
  }

  if (data.createdAt) {
    lines.push(
      `Date: ${new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    );
  }

  if (data.author || data.createdAt) {
    lines.push('');
  }

  lines.push(data.content);

  if (data.tags && data.tags.length > 0) {
    lines.push('');
    lines.push(`Tags: ${data.tags.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Convert vibelog content to JSON format
 */
export function exportAsJSON(data: VibelogExportData): string {
  return JSON.stringify(
    {
      title: data.title || null,
      content: data.content,
      author: data.author || null,
      createdAt: data.createdAt || null,
      tags: data.tags || [],
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

/**
 * Export content in the specified format
 */
export function exportContent(data: VibelogExportData, format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return exportAsMarkdown(data);
    case 'html':
      return exportAsHTML(data);
    case 'text':
      return exportAsText(data);
    case 'json':
      return exportAsJSON(data);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get file extension and MIME type for export format
 */
export function getExportFileInfo(format: ExportFormat): { extension: string; mimeType: string } {
  switch (format) {
    case 'markdown':
      return { extension: '.md', mimeType: 'text/markdown' };
    case 'html':
      return { extension: '.html', mimeType: 'text/html' };
    case 'text':
      return { extension: '.txt', mimeType: 'text/plain' };
    case 'json':
      return { extension: '.json', mimeType: 'application/json' };
    default:
      return { extension: '.txt', mimeType: 'text/plain' };
  }
}

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
