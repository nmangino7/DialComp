'use client';

import { Fragment } from 'react';
import { Rep, PointsEntry, PointsMetric, Period } from '@/lib/types';
import { calculatePoints } from '@/lib/points';
import EditableCell from './EditableCell';

interface Props {
  reps: Rep[];
  entries: PointsEntry[];
  participantIds: string[];
  onIncrement: (repId: string, metric: PointsMetric, period: Period) => void;
  onDecrement: (repId: string, metric: PointsMetric, period: Period) => void;
  onSet: (repId: string, metric: PointsMetric, period: Period, value: number) => void;
  onToggleParticipant: (repId: string) => void;
}

const RANK_STYLES = [
  'border-l-4 border-amber-400 bg-amber-400/5',
  'border-l-4 border-slate-300 bg-slate-300/5',
  'border-l-4 border-amber-700 bg-amber-700/5',
];

const RANK_BADGES = ['🥇', '🥈', '🥉'];

const METRIC_LABELS: { key: PointsMetric; label: string; color: string }[] = [
  { key: 'dials', label: 'Dials (+1)', color: 'border-blue-500/30' },
  { key: 'dnc', label: 'DNC (-3)', color: 'border-red-500/30' },
  { key: 'notInterested', label: 'Not Int. (-1)', color: 'border-orange-500/30' },
  { key: 'sets', label: 'Sets (+10)', color: 'border-emerald-500/30' },
];

function TotalCell({ value }: { value: number }) {
  return (
    <td className="px-2 py-2 text-center font-bold text-white tabular-nums">
      {value}
    </td>
  );
}

export default function PointsCompetition({
  reps,
  entries,
  participantIds,
  onIncrement,
  onDecrement,
  onSet,
  onToggleParticipant,
}: Props) {
  const activeEntries = entries.filter((e) => participantIds.includes(e.repId));
  const sorted = [...activeEntries].sort(
    (a, b) => calculatePoints(b) - calculatePoints(a)
  );

  return (
    <div>
      {/* Rep Selector */}
      <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Select Competitors
        </h3>
        <div className="flex flex-wrap gap-2">
          {reps.map((rep) => {
            const active = participantIds.includes(rep.id);
            return (
              <button
                key={rep.id}
                onClick={() => onToggleParticipant(rep.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {rep.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 uppercase text-xs tracking-wider">
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-3 py-3 text-left">Rep</th>
              {METRIC_LABELS.map((m) => (
                <th key={m.key} colSpan={3} className={`px-2 py-3 text-center border-b-2 ${m.color}`}>
                  {m.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center border-b-2 border-yellow-500/30">Points</th>
            </tr>
            <tr className="text-slate-500 text-xs">
              <th></th>
              <th></th>
              {METRIC_LABELS.map((m) => (
                <Fragment key={m.key}>
                  <th className="px-1 py-1 text-center">AM</th>
                  <th className="px-1 py-1 text-center">PM</th>
                  <th className="px-1 py-1 text-center font-bold text-slate-400">Total</th>
                </Fragment>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, idx) => {
              const rep = reps.find((r) => r.id === entry.repId);
              if (!rep) return null;
              const points = calculatePoints(entry);
              const rankStyle = idx < 3 ? RANK_STYLES[idx] : '';

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
                  {METRIC_LABELS.map((m) => (
                    <Fragment key={m.key}>
                      <EditableCell
                        value={entry[m.key].morning}
                        onInc={() => onIncrement(rep.id, m.key, 'morning')}
                        onDec={() => onDecrement(rep.id, m.key, 'morning')}
                        onSet={(v) => onSet(rep.id, m.key, 'morning', v)}
                      />
                      <EditableCell
                        value={entry[m.key].afternoon}
                        onInc={() => onIncrement(rep.id, m.key, 'afternoon')}
                        onDec={() => onDecrement(rep.id, m.key, 'afternoon')}
                        onSet={(v) => onSet(rep.id, m.key, 'afternoon', v)}
                      />
                      <TotalCell value={entry[m.key].morning + entry[m.key].afternoon} />
                    </Fragment>
                  ))}
                  <td
                    className={`px-3 py-2 text-center font-bold text-lg tabular-nums ${
                      points >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="text-center text-slate-500 py-8">
            Select competitors above to start tracking points.
          </p>
        )}
      </div>
    </div>
  );
}
