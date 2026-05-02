'use client';

import { Rep } from '@/lib/types';
import AnimatedNumber from './AnimatedNumber';

interface LeaderboardEntry {
  rep: Rep;
  value: number;
  label: string;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onRepClick?: (rep: Rep) => void;
}

const PODIUM = [
  {
    bg: 'from-amber-500/25 to-amber-600/10 border-amber-400/50',
    badge: '🥇',
    text: 'text-amber-200',
    size: 'text-3xl',
    valueSize: 'text-4xl',
    glow: 'animate-gold-glow',
    rank: '1st',
  },
  {
    bg: 'from-slate-400/20 to-slate-500/10 border-slate-300/30',
    badge: '🥈',
    text: 'text-slate-200',
    size: 'text-2xl',
    valueSize: 'text-3xl',
    glow: '',
    rank: '2nd',
  },
  {
    bg: 'from-orange-600/20 to-orange-700/10 border-orange-500/30',
    badge: '🥉',
    text: 'text-orange-200',
    size: 'text-xl',
    valueSize: 'text-2xl',
    glow: '',
    rank: '3rd',
  },
];

export default function Leaderboard({ entries, onRepClick }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="text-5xl mb-3">&#9876;&#65039;</div>
        <p className="text-slate-400 font-semibold text-lg">The Arena Awaits</p>
        <p className="text-slate-600 text-sm mt-1">Join below to start competing</p>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);

  return (
    <div className="space-y-2.5">
      {top3.map((entry, idx) => {
        const style = PODIUM[idx];
        return (
          <button
            key={entry.rep.id}
            onClick={() => onRepClick?.(entry.rep)}
            className={`w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r ${style.bg} border transition-all animate-fade-in ${style.glow} btn-press`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex flex-col items-center min-w-[44px]">
              <span className="text-3xl leading-none">{style.badge}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-extrabold ${style.text} ${style.size} truncate leading-tight`}>
                {entry.rep.name}
              </p>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className={`font-black tabular-nums ${style.valueSize} ${style.text} leading-none`}>
                <AnimatedNumber value={entry.value} />
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-semibold">
                {entry.label}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
