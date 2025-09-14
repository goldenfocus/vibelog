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
    <div>
      {/* Render sanitized markdown content with custom styles */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-3xl sm:text-4xl font-bold bg-gradient-electric bg-clip-text text-transparent mb-4 leading-tight"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl sm:text-2xl text-foreground font-semibold mt-6 mb-3" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-muted-foreground leading-relaxed mb-4" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 space-y-2 mb-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-6 space-y-2 mb-4" {...props} />
          ),
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
          a: ({ node, ...props }) => (
            <a className="text-electric underline hover:text-electric/80" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Teaser CTA if applicable */}
      {isTeaser && (
        <div className="mt-6 p-4 bg-gradient-to-r from-electric/5 to-transparent border border-electric/20 rounded-xl">
          <div className="flex items-center gap-2 text-electric">
            <span className="text-xl">🔒</span>
            <span className="font-semibold">
              <button 
                onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')}
                className="underline hover:text-electric-glow transition-colors cursor-pointer"
              >
                {t('navigation.signUp')}
              </button>
              {' '}{t('components.micRecorder.unlockMessage')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}