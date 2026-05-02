'use client';

import { Rep, PointsEntry } from '@/lib/types';
import { calculatePoints } from '@/lib/points';
import AnimatedNumber from './AnimatedNumber';

interface StickyHudProps {
  rep: Rep;
  entry: PointsEntry;
  rank: number;
  totalReps: number;
  onQuickSet: () => void;
  onQuickDial: () => void;
}

export default function StickyHud({ rep, entry, rank, totalReps, onQuickSet, onQuickDial }: StickyHudProps) {
  const points = calculatePoints(entry);
  const totalSets = entry.sets.morning + entry.sets.afternoon;
  const totalDials = entry.dials.morning + entry.dials.afternoon;

  const rankColor =
    rank === 1 ? 'text-amber-400'
    : rank === 2 ? 'text-slate-300'
    : rank === 3 ? 'text-orange-400'
    : 'text-stone-400';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-lg mx-auto px-3 pb-3">
        <div className="pointer-events-auto bg-gradient-to-r from-stone-900/95 via-slate-900/95 to-stone-900/95 backdrop-blur-md border border-amber-900/40 rounded-2xl shadow-2xl flex items-center gap-2 p-2">
          {/* Avatar + name */}
          <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-sm font-extrabold text-white shadow-lg shrink-0">
              {rep.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate leading-tight">{rep.name}</p>
              <p className={`text-[10px] font-semibold ${rankColor}`}>
                #{rank}<span className="text-stone-600">/{totalReps}</span>
                <span className="text-stone-600"> · </span>
                <span className={points >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  <AnimatedNumber value={points} /> pts
                </span>
                <span className="text-stone-600"> · </span>
                <span className="text-purple-400"><AnimatedNumber value={totalSets} /> sets</span>
                <span className="text-stone-600"> · </span>
                <span className="text-blue-400"><AnimatedNumber value={totalDials} /> dials</span>
              </p>
            </div>
          </div>

          {/* Quick action buttons */}
          <button
            onClick={onQuickDial}
            aria-label="Quick add dial"
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 hover:brightness-110 active:brightness-90 text-white font-extrabold transition-all flex flex-col items-center justify-center btn-press shadow-lg shrink-0 leading-none"
          >
            <span className="text-base">+1</span>
            <span className="text-[8px] uppercase tracking-wider">dial</span>
          </button>
          <button
            onClick={onQuickSet}
            aria-label="Quick add set"
            className="w-14 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 hover:brightness-110 active:brightness-90 text-white font-extrabold transition-all flex flex-col items-center justify-center btn-press shadow-lg animate-pulse-glow shrink-0 leading-none"
          >
            <span className="text-base">+1</span>
            <span className="text-[8px] uppercase tracking-wider">SET</span>
          </button>
        </div>
      </div>
    </div>
  );
}
