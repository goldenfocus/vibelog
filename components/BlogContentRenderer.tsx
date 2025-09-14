"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { useI18n } from "@/components/providers/I18nProvider";

interface BlogContentRendererProps {
  content: string;
  isTeaser?: boolean;
}

export default function BlogContentRenderer({
  content,
  isTeaser = false
}: BlogContentRendererProps) {
  const { t } = useI18n();

  return (
    <article className="max-w-none">
      {/* Render sanitized markdown content with enhanced styling */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-3xl sm:text-4xl font-bold bg-gradient-electric bg-clip-text text-transparent mb-6 leading-tight tracking-tight"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl sm:text-3xl text-foreground font-semibold mt-8 mb-4 tracking-tight border-l-4 border-electric/30 pl-4" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl sm:text-2xl text-foreground font-semibold mt-6 mb-3 tracking-tight" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 tracking-wide" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="space-y-3 mb-6 pl-0" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="space-y-3 mb-6 pl-0 counter-reset-[list-counter]" {...props} />
          ),
          li: ({ node, ...props }) => {
            const parent = (node as any)?.parent?.tagName;
            if (parent === 'ul') {
              return (
                <li className="flex items-start gap-3 text-muted-foreground leading-relaxed" {...props}>
                  <span className="w-2 h-2 rounded-full bg-electric/60 mt-2 flex-shrink-0"></span>
                  <span className="flex-1">{props.children}</span>
                </li>
              );
            }
            return (
              <li className="flex items-start gap-3 text-muted-foreground leading-relaxed counter-increment-[list-counter]" {...props}>
                <span className="w-6 h-6 rounded-full bg-electric/10 border border-electric/30 flex items-center justify-center text-sm font-semibold text-electric flex-shrink-0 mt-0.5">
                  <span className="counter-[list-counter]"></span>
                </span>
                <span className="flex-1">{props.children}</span>
              </li>
            );
          },
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-foreground bg-electric/5 px-1 py-0.5 rounded" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-electric/80" {...props} />
          ),
          code: ({ node, ...props }) => (
            <code className="bg-muted/50 text-electric px-1.5 py-0.5 rounded text-sm font-mono border" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="bg-muted/30 p-4 rounded-xl overflow-x-auto border border-border/20 mb-6" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-electric/30 bg-electric/5 pl-6 pr-4 py-4 my-6 italic text-muted-foreground rounded-r-lg" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-electric underline hover:text-electric-glow transition-colors duration-200 font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent my-8" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Teaser CTA if applicable */}
      {isTeaser && (
        <div className="mt-8 p-6 bg-gradient-to-r from-electric/5 via-electric/10 to-transparent border border-electric/20 rounded-2xl backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-electric/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-electric mb-2">Continue Reading</h4>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {t('components.micRecorder.unlockMessage')}
              </p>
              <button
                onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-2 bg-electric text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-glow transition-colors duration-200"
              >
                {t('navigation.signUp')}
                <span className="text-sm">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}