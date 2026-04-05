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
  { key: 'notInterested', label: 'Not Interested', color: 'orange' },
  { key: 'sets', label: 'Sets', color: 'emerald' },
];

function TrackerRow({
  rep, entry, rank, isMe, isAdmin, onIncrement, onDecrement, onSet,
}: {
  rep: Rep; entry: TrackerEntry; rank: number; isMe: boolean; isAdmin: boolean;
  onIncrement: TrackerStandingsProps['onIncrement'];
  onDecrement: TrackerStandingsProps['onDecrement'];
  onSet: TrackerStandingsProps['onSet'];
}) {
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<Period>('morning');
  const totalSets = entry.sets.morning + entry.sets.afternoon;
  const totalDials = entry.dials.morning + entry.dials.afternoon;
  const canEdit = isMe || isAdmin;

  return (
    <div
      className={`rounded-xl border transition-all animate-fade-in ${
        isMe
          ? 'border-blue-500/40 bg-blue-500/8 shadow-md shadow-blue-500/5'
          : 'border-slate-700/40 bg-slate-800/60 hover:bg-slate-800/80'
      }`}
    >
      <button
        onClick={() => canEdit && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className="text-slate-500 font-mono text-sm w-6 text-right font-bold">{rank}</span>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
          isMe ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-slate-700'
        }`}>
          {rep.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-semibold truncate block ${isMe ? 'text-blue-300' : 'text-white'}`}>
            {rep.name}
          </span>
          {isMe && <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">You</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="font-black text-purple-400 tabular-nums text-xl">{totalSets}</span>
            <span className="text-[10px] text-slate-600 block uppercase tracking-wider">sets</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-400 tabular-nums text-base">{totalDials}</span>
            <span className="text-[10px] text-slate-600 block uppercase tracking-wider">dials</span>
          </div>
        </div>
        {canEdit && (
          <span className={`text-slate-500 text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        )}
      </button>

      {expanded && canEdit && (
        <div className="px-4 pb-4 border-t border-slate-700/30 animate-slide-down">
          <div className="flex bg-slate-900/80 rounded-lg p-1 my-3">
            <button
              onClick={() => setPeriod('morning')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                period === 'morning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'text-slate-500'
              }`}
            >
              ☀️ AM
            </button>
            <button
              onClick={() => setPeriod('afternoon')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                period === 'afternoon' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'text-slate-500'
              }`}
            >
              🌙 PM
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
  rep, entry, rank, isMe, isAdmin, onIncrement, onDecrement, onSet,
}: {
  rep: Rep; entry: PointsEntry; rank: number; isMe: boolean; isAdmin: boolean;
  onIncrement: PointsStandingsProps['onIncrement'];
  onDecrement: PointsStandingsProps['onDecrement'];
  onSet: PointsStandingsProps['onSet'];
}) {
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<Period>('morning');
  const points = calculatePoints(entry);
  const canEdit = isMe || isAdmin;

  return (
    <div
      className={`rounded-xl border transition-all animate-fade-in ${
        isMe
          ? 'border-blue-500/40 bg-blue-500/8 shadow-md shadow-blue-500/5'
          : 'border-slate-700/40 bg-slate-800/60 hover:bg-slate-800/80'
      }`}
    >
      <button
        onClick={() => canEdit && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className="text-slate-500 font-mono text-sm w-6 text-right font-bold">{rank}</span>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
          isMe ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-slate-700'
        }`}>
          {rep.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-semibold truncate block ${isMe ? 'text-blue-300' : 'text-white'}`}>
            {rep.name}
          </span>
          {isMe && <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">You</span>}
        </div>
        <div className="text-right shrink-0">
          <span className={`font-black tabular-nums text-xl ${points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {points}
          </span>
          <span className="text-[10px] text-slate-600 block uppercase tracking-wider">pts</span>
        </div>
        {canEdit && (
          <span className={`text-slate-500 text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        )}
      </button>

      {expanded && canEdit && (
        <div className="px-4 pb-4 border-t border-slate-700/30 animate-slide-down">
          <div className="flex bg-slate-900/80 rounded-lg p-1 my-3">
            <button
              onClick={() => setPeriod('morning')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                period === 'morning' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'text-slate-500'
              }`}
            >
              ☀️ AM
            </button>
            <button
              onClick={() => setPeriod('afternoon')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                period === 'afternoon' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'text-slate-500'
              }`}
            >
              🌙 PM
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
      const ta = a.sets.morning + a.sets.afternoon;
      const tb = b.sets.morning + b.sets.afternoon;
      return tb - ta;
    });

    const rest = sorted.slice(3);
    if (rest.length === 0 && sorted.length <= 3) return null;

    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
          <span className="h-px flex-1 bg-slate-700/50" />
          Full Standings
          <span className="h-px flex-1 bg-slate-700/50" />
        </h3>
        {rest.map((entry, idx) => {
          const rep = props.reps.find((r) => r.id === entry.repId);
          if (!rep) return null;
          return (
            <TrackerRow
              key={rep.id} rep={rep} entry={entry} rank={idx + 4}
              isMe={rep.id === props.myRepId} isAdmin={props.isAdmin}
              onIncrement={props.onIncrement} onDecrement={props.onDecrement} onSet={props.onSet}
            />
          );
        })}
      </div>
    );
  }

  const activeEntries = props.entries.filter((e) => props.participantIds.includes(e.repId));
  const sorted = [...activeEntries].sort((a, b) => calculatePoints(b) - calculatePoints(a));
  const rest = sorted.slice(3);
  if (rest.length === 0 && sorted.length <= 3) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
        <span className="h-px flex-1 bg-slate-700/50" />
        Full Standings
        <span className="h-px flex-1 bg-slate-700/50" />
      </h3>
      {rest.map((entry, idx) => {
        const rep = props.reps.find((r) => r.id === entry.repId);
        if (!rep) return null;
        return (
          <PointsRow
            key={rep.id} rep={rep} entry={entry} rank={idx + 4}
            isMe={rep.id === props.myRepId} isAdmin={props.isAdmin}
            onIncrement={props.onIncrement} onDecrement={props.onDecrement} onSet={props.onSet}
          />
        );
      })}
    </div>
  );
}
