'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface VibelogContentRendererProps {
  content: string;
  isTeaser?: boolean;
  onReadMore?: () => void;
}

export default function VibelogContentRenderer({
  content,
  isTeaser = false,
  onReadMore,
}: VibelogContentRendererProps) {
  return (
    <article className="max-w-none">
      {/* Render sanitized markdown content with enhanced styling */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ node: _node, ...props }) => (
            <h1
              className="mb-6 bg-gradient-electric bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-4xl"
              {...props}
            />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2
              className="mb-4 mt-8 border-l-4 border-electric/30 pl-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              {...props}
            />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3
              className="mb-3 mt-6 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              {...props}
            />
          ),
          p: ({ node: _node, ...props }) => (
            <p
              className="mb-6 text-base leading-relaxed tracking-wide text-muted-foreground sm:text-lg"
              {...props}
            />
          ),
          ul: ({ node: _node, ...props }) => <ul className="mb-6 space-y-3 pl-0" {...props} />,
          ol: ({ node: _node, ...props }) => (
            <ol className="counter-reset-[list-counter] mb-6 space-y-3 pl-0" {...props} />
          ),
          li: ({ node: _node, ...props }) => {
            const parent = (_node as any)?.parent?.tagName;
            if (parent === 'ul') {
              return (
                <li
                  className="flex items-start gap-3 leading-relaxed text-muted-foreground"
                  {...props}
                >
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-electric/60"></span>
                  <span className="flex-1">{props.children}</span>
                </li>
              );
            }
            return (
              <li
                className="counter-increment-[list-counter] flex items-start gap-3 leading-relaxed text-muted-foreground"
                {...props}
              >
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-electric/30 bg-electric/10 text-sm font-semibold text-electric">
                  <span className="counter-[list-counter]"></span>
                </span>
                <span className="flex-1">{props.children}</span>
              </li>
            );
          },
          strong: ({ node: _node, ...props }) => (
            <strong
              className="rounded bg-electric/5 px-1 py-0.5 font-semibold text-foreground"
              {...props}
            />
          ),
          em: ({ node: _node, ...props }) => <em className="italic text-electric/80" {...props} />,
          code: ({ node: _node, ...props }) => (
            <code
              className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-sm text-electric"
              {...props}
            />
          ),
          pre: ({ node: _node, ...props }) => (
            <pre
              className="mb-6 overflow-x-auto rounded-xl border border-border/20 bg-muted/30 p-4"
              {...props}
            />
          ),
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className="my-6 rounded-r-lg border-l-4 border-electric/30 bg-electric/5 py-4 pl-6 pr-4 italic text-muted-foreground"
              {...props}
            />
          ),
          a: ({ node: _node, ...props }) => (
            <a
              className="font-medium text-electric underline transition-colors duration-200 hover:text-electric-glow"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          hr: ({ node: _node, ...props }) => (
            <hr
              className="my-8 h-px border-0 bg-gradient-to-r from-transparent via-border to-transparent"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Teaser CTA if applicable */}
      {isTeaser && onReadMore && (
        <div className="mt-8 rounded-2xl border border-electric/20 bg-gradient-to-r from-electric/5 via-electric/10 to-transparent p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-electric/10">
              <span className="text-2xl">📖</span>
            </div>
            <div className="flex-1">
              <h4 className="mb-2 text-lg font-semibold text-electric">Continue Reading</h4>
              <p className="mb-4 leading-relaxed text-muted-foreground">
                Read the full vibelog to discover the complete story and insights.
              </p>
              <button
                onClick={onReadMore}
                className="inline-flex items-center gap-2 rounded-lg bg-electric px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-electric-glow"
              >
                Read More
                <span className="text-sm">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
