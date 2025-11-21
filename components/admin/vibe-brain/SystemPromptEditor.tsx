'use client';

import { FileText, Eye, Code, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfigCard } from './ConfigCard';

interface SystemPromptConfig {
  content: string;
  version: number;
}

interface Props {
  config: SystemPromptConfig | null;
  onSave: (value: SystemPromptConfig) => Promise<void>;
  lastUpdated?: string;
}

const TEMPLATE_VARIABLES = [
  { name: '{{user.name}}', desc: "User's display name" },
  { name: '{{user.username}}', desc: "User's @username" },
  { name: '{{user.isAdmin}}', desc: 'Admin status (true/false)' },
  { name: '{{memories}}', desc: 'Injected user memories' },
  { name: '{{date}}', desc: 'Current date' },
];

export function SystemPromptEditor({ config, onSave, lastUpdated }: Props) {
  const [content, setContent] = useState(config?.content || '');
  const [version, setVersion] = useState(config?.version || 1);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (config) {
      setContent(config.content);
      setVersion(config.version);
    }
  }, [config]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  };

  const handleSave = useCallback(async () => {
    await onSave({ content, version: version + 1 });
    setVersion(v => v + 1);
    setIsDirty(false);
  }, [content, version, onSave]);

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[data-prompt-editor]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + variable + content.slice(end);
      setContent(newContent);
      setIsDirty(true);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  return (
    <ConfigCard
      title="System Prompt"
      description="The main personality and behavior instructions for Vibe Brain"
      icon={<FileText className="h-5 w-5" />}
      onSave={handleSave}
      isDirty={isDirty}
      lastUpdated={lastUpdated}
    >
      <div className="space-y-4">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'edit'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">v{version}</span>
            <span>{content.length} chars</span>
          </div>
        </div>

        {/* Template Variables */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Template Variables
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map(v => (
              <button
                key={v.name}
                onClick={() => insertVariable(v.name)}
                className="group relative rounded-md bg-background px-2 py-1 font-mono text-xs text-purple-500 transition-colors hover:bg-purple-500 hover:text-white"
                title={v.desc}
              >
                {v.name}
                <span className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                  {v.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor / Preview */}
        {viewMode === 'edit' ? (
          <textarea
            data-prompt-editor
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="Enter the system prompt for Vibe Brain..."
            className="min-h-[400px] w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        ) : (
          <div className="min-h-[400px] rounded-lg border border-border bg-muted/30 p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {content.split('\n').map((line, i) => (
                <p key={i} className="mb-2 text-sm text-foreground">
                  {line || <br />}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </ConfigCard>
  );
}
