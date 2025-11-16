/**
 * Vibe Timeline Component
 * 
 * Mood graph showing vibe history over time
 */

'use client';

import { useMemo } from 'react';
import type { VibeHistoryEntry } from '@/lib/vibe/types';
import { cn } from '@/lib/utils';

interface VibeTimelineProps {
  entries: VibeHistoryEntry[];
  className?: string;
}

export function VibeTimeline({ entries, className }: VibeTimelineProps) {
  const chartData = useMemo(() => {
    if (entries.length === 0) return [];

    // Group by time periods (last 7 days, hourly buckets)
    const now = new Date();
    const buckets: Array<{
      time: Date;
      vibes: VibeHistoryEntry[];
      avgScores: {
        excitement: number;
        stress: number;
        calmness: number;
        [key: string]: number;
      };
    }> = [];

    // Create hourly buckets for last 7 days
    for (let i = 168; i >= 0; i--) {
      const bucketTime = new Date(now);
      bucketTime.setHours(bucketTime.getHours() - i);
      bucketTime.setMinutes(0, 0, 0);

      const bucketEntries = entries.filter(entry => {
        const entryTime = new Date(entry.timestamp);
        return (
          entryTime >= bucketTime &&
          entryTime < new Date(bucketTime.getTime() + 60 * 60 * 1000)
        );
      });

      if (bucketEntries.length > 0) {
        // Calculate average scores
        const avgScores = bucketEntries.reduce(
          (acc, entry) => {
            Object.entries(entry.vibe.scores).forEach(([key, value]) => {
              acc[key] = (acc[key] || 0) + value;
            });
            return acc;
          },
          {} as Record<string, number>
        );

        Object.keys(avgScores).forEach(key => {
          avgScores[key] = Math.round(avgScores[key] / bucketEntries.length);
        });

        buckets.push({
          time: bucketTime,
          vibes: bucketEntries,
          avgScores: avgScores as any,
        });
      }
    }

    return buckets;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 p-8 text-center', className)}>
        <p className="text-gray-500">No vibe history yet. Start communicating to see your vibe timeline!</p>
      </div>
    );
  }

  const maxValue = 100;
  const chartHeight = 200;
  const chartWidth = Math.max(800, chartData.length * 4);

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)}>
      <h3 className="mb-4 text-lg font-semibold">Vibe Timeline</h3>
      
      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight + 40}
          className="w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(value => {
            const y = chartHeight - (value / maxValue) * chartHeight;
            return (
              <g key={value}>
                <line
                  x1={0}
                  y1={y + 20}
                  x2={chartWidth}
                  y2={y + 20}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray={value === 50 ? '0' : '4'}
                />
                <text
                  x={0}
                  y={y + 25}
                  fontSize={12}
                  fill="#6b7280"
                  textAnchor="start"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Excitement line */}
          {chartData.length > 1 && (
            <polyline
              points={chartData
                .map((d, i) => {
                  const x = (i / (chartData.length - 1)) * chartWidth;
                  const y = chartHeight - (d.avgScores.excitement / maxValue) * chartHeight + 20;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#FF6B6B"
              strokeWidth={2}
            />
          )}

          {/* Stress line */}
          {chartData.length > 1 && (
            <polyline
              points={chartData
                .map((d, i) => {
                  const x = (i / (chartData.length - 1)) * chartWidth;
                  const y = chartHeight - (d.avgScores.stress / maxValue) * chartHeight + 20;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#FF8C94"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}

          {/* Calmness line */}
          {chartData.length > 1 && (
            <polyline
              points={chartData
                .map((d, i) => {
                  const x = (i / (chartData.length - 1)) * chartWidth;
                  const y = chartHeight - (d.avgScores.calmness / maxValue) * chartHeight + 20;
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#95E1D3"
              strokeWidth={2}
            />
          )}

          {/* Data points */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * chartWidth;
            return (
              <circle
                key={i}
                cx={x}
                cy={chartHeight - (d.avgScores.excitement / maxValue) * chartHeight + 20}
                r={3}
                fill="#FF6B6B"
                className="cursor-pointer hover:r-5"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#FF6B6B]" />
          <span>Excitement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#FF8C94]" />
          <span>Stress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#95E1D3]" />
          <span>Calmness</span>
        </div>
      </div>
    </div>
  );
}

