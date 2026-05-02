'use client';

import { useEffect, useState } from 'react';
import { subscribe, AppEvent } from '@/lib/eventBus';

const FEED_TYPES = new Set(['set_scored', 'kill', 'rank_up', 'took_lead', 'milestone', 'big_set_run', 'powerup_collected', 'achievement']);

const ICONS: Record<string, string> = {
  set_scored: '\u{1F525}',
  kill: '\u{2620}️',
  rank_up: '\u{1F4C8}',
  took_lead: '\u{1F451}',
  milestone: '\u{1F389}',
  big_set_run: '\u{1F31F}',
  powerup_collected: '\u{2728}',
  achievement: '\u{1F3C6}',
};

export default function ActivityFeed() {
  const [events, setEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    const unsub = subscribe((e) => {
      if (!FEED_TYPES.has(e.type)) return;
      setEvents((prev) => [e, ...prev].slice(0, 8));
    });
    return unsub;
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="bg-gradient-to-b from-stone-900/80 to-slate-900/80 rounded-xl border border-amber-900/30 p-3 backdrop-blur-sm">
      <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-2 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Live Feed
      </h3>
      <div className="space-y-1 max-h-48 overflow-hidden">
        {events.map((e, idx) => (
          <div
            key={e.id}
            className="flex items-center gap-2 text-xs animate-fade-in"
            style={{ opacity: Math.max(0.4, 1 - idx * 0.1) }}
          >
            <span className="text-base">{ICONS[e.type] || '\u{2022}'}</span>
            <span className="text-stone-300 flex-1 truncate">{e.message}</span>
            <span className="text-stone-600 text-[10px] tabular-nums">
              {timeAgo(e.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 5) return 'now';
  if (d < 60) return `${d}s`;
  return `${Math.floor(d / 60)}m`;
}
