/**
 * Clarity Mode Component
 *
 * Shows the true intention of messages, stripping away emotional masking
 */

'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import { getHumorModule } from '@/lib/vibe/humor';
import { getSafetyFilter } from '@/lib/vibe/safety';
import type { VibeAnalysis } from '@/lib/vibe/types';

interface ClarityModeProps {
  text: string;
  vibe: VibeAnalysis;
  className?: string;
}

export function ClarityMode({ text: _text, vibe, className }: ClarityModeProps) {
  const [expanded, setExpanded] = useState(false);

  const safetyFilter = getSafetyFilter();
  const humorModule = getHumorModule();

  const safety = safetyFilter.analyze(vibe);
  const notOkayCheck = humorModule.checkNotOkayButOkay(vibe);
  const sarcasm = humorModule.detectSarcasm(vibe);

  // Generate clarity insights
  const insights: Array<{
    type: 'warning' | 'info' | 'humor' | 'masking';
    title: string;
    message: string;
    severity?: 'low' | 'medium' | 'high';
  }> = [];

  // Safety warnings
  safety.warnings.forEach(warning => {
    insights.push({
      type: warning.type === 'harmful' ? 'warning' : 'masking',
      title:
        warning.type === 'passiveAggressive'
          ? 'Passive-Aggressive Detected'
          : warning.type === 'hiddenFrustration'
            ? 'Hidden Frustration'
            : warning.type === 'emotionalMasking'
              ? 'Emotional Masking'
              : 'Safety Concern',
      message: warning.message,
      severity: warning.severity,
    });
  });

  // Not okay but okay
  if (notOkayCheck.level > 40) {
    insights.push({
      type: 'masking',
      title: 'Not Okay But Okay',
      message: notOkayCheck.message,
      severity: notOkayCheck.level > 80 ? 'high' : notOkayCheck.level > 60 ? 'medium' : 'low',
    });
  }

  // Sarcasm
  if (sarcasm.level !== 'none') {
    insights.push({
      type: 'humor',
      title: 'Sarcasm Detected',
      message: `Sarcasm level: ${sarcasm.level} (${Math.round(sarcasm.confidence * 100)}% confidence)`,
      severity: sarcasm.level === 'nuclear' ? 'high' : sarcasm.level === 'heavy' ? 'medium' : 'low',
    });
  }

  // Hidden vibes
  if (vibe.hiddenVibes.maskingStress) {
    insights.push({
      type: 'masking',
      title: 'Masking Stress',
      message: 'The sender appears to be hiding stress behind a calm facade.',
      severity: 'medium',
    });
  }

  if (vibe.hiddenVibes.performativeHappiness) {
    insights.push({
      type: 'masking',
      title: 'Performative Happiness',
      message: 'The happiness seems forced or performative rather than genuine.',
      severity: 'high',
    });
  }

  if (insights.length === 0) {
    return (
      <div className={cn('rounded-lg border border-green-200 bg-green-50 p-4', className)}>
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-sm font-medium text-green-800">
            Message appears authentic and clear
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-blue-200 bg-blue-50', className)}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🔍</span>
            <span className="font-medium text-blue-900">Clarity Mode</span>
            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs text-blue-800">
              {insights.length} insight{insights.length !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-blue-600">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-blue-200 p-4">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg p-3',
                insight.type === 'warning' && 'border border-red-200 bg-red-50',
                insight.type === 'masking' && 'border border-yellow-200 bg-yellow-50',
                insight.type === 'humor' && 'border border-purple-200 bg-purple-50',
                insight.type === 'info' && 'border border-blue-200 bg-blue-50'
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">
                  {insight.type === 'warning' && '⚠️'}
                  {insight.type === 'masking' && '🎭'}
                  {insight.type === 'humor' && '😏'}
                  {insight.type === 'info' && 'ℹ️'}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{insight.title}</div>
                  <div className="mt-1 text-sm text-gray-700">{insight.message}</div>
                  {insight.severity && (
                    <div className="mt-1 text-xs text-gray-500">Severity: {insight.severity}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
