'use client';

import { Fragment } from 'react';
import { Rep, TrackerEntry, TrackerMetric, Period } from '@/lib/types';

interface Props {
  reps: Rep[];
  entries: TrackerEntry[];
  onIncrement: (repId: string, metric: TrackerMetric, period: Period) => void;
  onDecrement: (repId: string, metric: TrackerMetric, period: Period) => void;
}

const RANK_STYLES = [
  'border-l-4 border-amber-400 bg-amber-400/5',
  'border-l-4 border-slate-300 bg-slate-300/5',
  'border-l-4 border-amber-700 bg-amber-700/5',
];

const RANK_BADGES = ['🥇', '🥈', '🥉'];

function Cell({
  value,
  onInc,
  onDec,
}: {
  value: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <td className="px-1 py-2 text-center">
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={onDec}
          className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-colors flex items-center justify-center"
        >
          −
        </button>
        <span className="w-8 text-center font-semibold text-white tabular-nums">
          {value}
        </span>
        <button
          onClick={onInc}
          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
    </td>
  );
}

function TotalCell({ value }: { value: number }) {
  return (
    <td className="px-2 py-2 text-center font-bold text-white tabular-nums">
      {value}
    </td>
  );
}

export default function CompetitionTracker({ reps, entries, onIncrement, onDecrement }: Props) {
  // Sort by total dials descending
  const sorted = [...entries].sort((a, b) => {
    const totalA = a.dials.morning + a.dials.afternoon;
    const totalB = b.dials.morning + b.dials.afternoon;
    return totalB - totalA;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 uppercase text-xs tracking-wider">
            <th className="px-3 py-3 text-left">#</th>
            <th className="px-3 py-3 text-left">Rep</th>
            <th colSpan={3} className="px-2 py-3 text-center border-b-2 border-blue-500/30">
              Dials
            </th>
            <th colSpan={3} className="px-2 py-3 text-center border-b-2 border-emerald-500/30">
              Pick Ups
            </th>
            <th colSpan={3} className="px-2 py-3 text-center border-b-2 border-purple-500/30">
              Sets
            </th>
          </tr>
          <tr className="text-slate-500 text-xs">
            <th></th>
            <th></th>
            <th className="px-1 py-1 text-center">AM</th>
            <th className="px-1 py-1 text-center">PM</th>
            <th className="px-1 py-1 text-center font-bold text-slate-400">Total</th>
            <th className="px-1 py-1 text-center">AM</th>
            <th className="px-1 py-1 text-center">PM</th>
            <th className="px-1 py-1 text-center font-bold text-slate-400">Total</th>
            <th className="px-1 py-1 text-center">AM</th>
            <th className="px-1 py-1 text-center">PM</th>
            <th className="px-1 py-1 text-center font-bold text-slate-400">Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, idx) => {
            const rep = reps.find((r) => r.id === entry.repId);
            if (!rep) return null;
            const rankStyle = idx < 3 ? RANK_STYLES[idx] : '';
            const metrics: TrackerMetric[] = ['dials', 'pickUps', 'sets'];

            return (
              <tr
                key={rep.id}
                className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${rankStyle}`}
              >
                <td className="px-3 py-2 text-center">
                  {idx < 3 ? (
                    <span className="text-lg">{RANK_BADGES[idx]}</span>
                  ) : (
                    <span className="text-slate-500 font-mono">{idx + 1}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">
                  {rep.name}
                </td>
                {metrics.map((metric) => (
                  <Fragment key={metric}>
                    <Cell
                      value={entry[metric].morning}
                      onInc={() => onIncrement(rep.id, metric, 'morning')}
                      onDec={() => onDecrement(rep.id, metric, 'morning')}
                    />
                    <Cell
                      value={entry[metric].afternoon}
                      onInc={() => onIncrement(rep.id, metric, 'afternoon')}
                      onDec={() => onDecrement(rep.id, metric, 'afternoon')}
                    />
                    <TotalCell
                      value={entry[metric].morning + entry[metric].afternoon}
                    />
                  </Fragment>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
