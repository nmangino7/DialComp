'use client';

import { useState } from 'react';
import { Rep, TrackerEntry, PointsEntry, TrackerMetric, PointsMetric, Period } from '@/lib/types';
import { calculatePoints } from '@/lib/points';
import MetricEditor from './MetricEditor';

interface TrackerStandingsProps {
  mode: 'tracker';
  reps: Rep[];
  entries: TrackerEntry[];
  myRepId: string | null;
  isAdmin: boolean;
  onIncrement: (repId: string, metric: TrackerMetric, period: Period) => void;
  onDecrement: (repId: string, metric: TrackerMetric, period: Period) => void;
  onSet: (repId: string, metric: TrackerMetric, period: Period, value: number) => void;
}

interface PointsStandingsProps {
  mode: 'points';
  reps: Rep[];
  entries: PointsEntry[];
  participantIds: string[];
  myRepId: string | null;
  isAdmin: boolean;
  onIncrement: (repId: string, metric: PointsMetric, period: Period) => void;
  onDecrement: (repId: string, metric: PointsMetric, period: Period) => void;
  onSet: (repId: string, metric: PointsMetric, period: Period, value: number) => void;
}

type StandingsProps = TrackerStandingsProps | PointsStandingsProps;

const TRACKER_METRICS: { key: TrackerMetric; label: string; color: string }[] = [
  { key: 'dials', label: 'Dials', color: 'blue' },
  { key: 'pickUps', label: 'Pick Ups', color: 'emerald' },
  { key: 'sets', label: 'Sets', color: 'purple' },
];

const POINTS_METRICS: { key: PointsMetric; label: string; color: string }[] = [
  { key: 'dials', label: 'Dials', color: 'blue' },
  { key: 'dnc', label: 'DNC', color: 'red' },
  { key: 'notInterested', label: 'Not Int.', color: 'orange' },
  { key: 'sets', label: 'Sets', color: 'emerald' },
];

function TrackerRow({
  rep,
  entry,
  rank,
  isMe,
  isAdmin,
  onIncrement,
  onDecrement,
  onSet,
}: {
  rep: Rep;
  entry: TrackerEntry;
  rank: number;
  isMe: boolean;
  isAdmin: boolean;
  onIncrement: TrackerStandingsProps['onIncrement'];
  onDecrement: TrackerStandingsProps['onDecrement'];
  onSet: TrackerStandingsProps['onSet'];
}) {
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<Period>('morning');
  const totalDials = entry.dials.morning + entry.dials.afternoon;
  const canEdit = isMe || isAdmin;

  return (
    <div className={`rounded-xl border transition-all ${isMe ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700/50 bg-slate-800/40'}`}>
      <button
        onClick={() => canEdit && setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-slate-500 font-mono text-sm w-6 text-right">{rank}</span>
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {rep.name.charAt(0).toUpperCase()}
        </div>
        <span className={`font-semibold flex-1 truncate ${isMe ? 'text-blue-300' : 'text-white'}`}>
          {rep.name} {isMe && <span className="text-xs text-blue-400">(you)</span>}
        </span>
        <span className="font-bold text-white tabular-nums text-lg">{totalDials}</span>
        <span className="text-xs text-slate-500">dials</span>
        {canEdit && (
          <span className="text-slate-600 text-sm">{expanded ? '▼' : '▶'}</span>
        )}
      </button>

      {expanded && canEdit && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="flex bg-slate-900 rounded-lg p-1 my-3">
            <button
              onClick={() => setPeriod('morning')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === 'morning' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => setPeriod('afternoon')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === 'afternoon' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Afternoon
            </button>
          </div>
          {TRACKER_METRICS.map((m) => (
            <MetricEditor
              key={m.key}
              label={m.label}
              value={entry[m.key][period]}
              onIncrement={() => onIncrement(rep.id, m.key, period)}
              onDecrement={() => onDecrement(rep.id, m.key, period)}
              onSet={(v) => onSet(rep.id, m.key, period, v)}
              color={m.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PointsRow({
  rep,
  entry,
  rank,
  isMe,
  isAdmin,
  onIncrement,
  onDecrement,
  onSet,
}: {
  rep: Rep;
  entry: PointsEntry;
  rank: number;
  isMe: boolean;
  isAdmin: boolean;
  onIncrement: PointsStandingsProps['onIncrement'];
  onDecrement: PointsStandingsProps['onDecrement'];
  onSet: PointsStandingsProps['onSet'];
}) {
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<Period>('morning');
  const points = calculatePoints(entry);
  const canEdit = isMe || isAdmin;

  return (
    <div className={`rounded-xl border transition-all ${isMe ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700/50 bg-slate-800/40'}`}>
      <button
        onClick={() => canEdit && setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-slate-500 font-mono text-sm w-6 text-right">{rank}</span>
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {rep.name.charAt(0).toUpperCase()}
        </div>
        <span className={`font-semibold flex-1 truncate ${isMe ? 'text-blue-300' : 'text-white'}`}>
          {rep.name} {isMe && <span className="text-xs text-blue-400">(you)</span>}
        </span>
        <span className={`font-bold tabular-nums text-lg ${points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {points}
        </span>
        <span className="text-xs text-slate-500">pts</span>
        {canEdit && (
          <span className="text-slate-600 text-sm">{expanded ? '▼' : '▶'}</span>
        )}
      </button>

      {expanded && canEdit && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="flex bg-slate-900 rounded-lg p-1 my-3">
            <button
              onClick={() => setPeriod('morning')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === 'morning' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => setPeriod('afternoon')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === 'afternoon' ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              Afternoon
            </button>
          </div>
          {POINTS_METRICS.map((m) => (
            <MetricEditor
              key={m.key}
              label={m.label}
              value={entry[m.key][period]}
              onIncrement={() => onIncrement(rep.id, m.key, period)}
              onDecrement={() => onDecrement(rep.id, m.key, period)}
              onSet={(v) => onSet(rep.id, m.key, period, v)}
              color={m.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Standings(props: StandingsProps) {
  if (props.mode === 'tracker') {
    const sorted = [...props.entries].sort((a, b) => {
      const ta = a.dials.morning + a.dials.afternoon;
      const tb = b.dials.morning + b.dials.afternoon;
      return tb - ta;
    });

    // Skip top 3 (shown in leaderboard)
    const rest = sorted.slice(3);
    if (rest.length === 0 && sorted.length <= 3) return null;

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1">
          Full Standings
        </h3>
        {rest.map((entry, idx) => {
          const rep = props.reps.find((r) => r.id === entry.repId);
          if (!rep) return null;
          return (
            <TrackerRow
              key={rep.id}
              rep={rep}
              entry={entry}
              rank={idx + 4}
              isMe={rep.id === props.myRepId}
              isAdmin={props.isAdmin}
              onIncrement={props.onIncrement}
              onDecrement={props.onDecrement}
              onSet={props.onSet}
            />
          );
        })}
      </div>
    );
  }

  // Points mode
  const activeEntries = props.entries.filter((e) =>
    props.participantIds.includes(e.repId),
  );
  const sorted = [...activeEntries].sort(
    (a, b) => calculatePoints(b) - calculatePoints(a),
  );

  const rest = sorted.slice(3);
  if (rest.length === 0 && sorted.length <= 3) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1">
        Full Standings
      </h3>
      {rest.map((entry, idx) => {
        const rep = props.reps.find((r) => r.id === entry.repId);
        if (!rep) return null;
        return (
          <PointsRow
            key={rep.id}
            rep={rep}
            entry={entry}
            rank={idx + 4}
            isMe={rep.id === props.myRepId}
            isAdmin={props.isAdmin}
            onIncrement={props.onIncrement}
            onDecrement={props.onDecrement}
            onSet={props.onSet}
          />
        );
      })}
    </div>
  );
}
