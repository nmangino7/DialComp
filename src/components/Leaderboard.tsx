'use client';

import { Rep } from '@/lib/types';

interface LeaderboardEntry {
  rep: Rep;
  value: number;
  label: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const PODIUM = [
  { bg: 'from-amber-500/20 to-amber-600/10 border-amber-500/40', badge: '🥇', text: 'text-amber-300', size: 'text-3xl' },
  { bg: 'from-slate-400/15 to-slate-500/10 border-slate-400/30', badge: '🥈', text: 'text-slate-300', size: 'text-2xl' },
  { bg: 'from-orange-600/15 to-orange-700/10 border-orange-600/30', badge: '🥉', text: 'text-orange-300', size: 'text-xl' },
];

export default function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No competitors yet. Join the competition below!
      </div>
    );
  }

  const top3 = entries.slice(0, 3);

  return (
    <div className="space-y-2">
      {top3.map((entry, idx) => {
        const style = PODIUM[idx];
        return (
          <div
            key={entry.rep.id}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl bg-gradient-to-r ${style.bg} border transition-all animate-fade-in`}
          >
            <span className="text-2xl">{style.badge}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold ${style.text} ${style.size} truncate`}>
                {entry.rep.name}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-black tabular-nums ${style.size} ${style.text}`}>
                {entry.value}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{entry.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
