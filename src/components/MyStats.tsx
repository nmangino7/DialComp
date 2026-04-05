'use client';

import { useState } from 'react';
import { Rep, TrackerEntry, PointsEntry, TrackerMetric, PointsMetric, Period } from '@/lib/types';
import MetricEditor from './MetricEditor';

interface MyTrackerStatsProps {
  mode: 'tracker';
  rep: Rep;
  entry: TrackerEntry;
  onIncrement: (repId: string, metric: TrackerMetric, period: Period) => void;
  onDecrement: (repId: string, metric: TrackerMetric, period: Period) => void;
  onSet: (repId: string, metric: TrackerMetric, period: Period, value: number) => void;
  rank: number;
  totalReps: number;
}

interface MyPointsStatsProps {
  mode: 'points';
  rep: Rep;
  entry: PointsEntry;
  totalPoints: number;
  onIncrement: (repId: string, metric: PointsMetric, period: Period) => void;
  onDecrement: (repId: string, metric: PointsMetric, period: Period) => void;
  onSet: (repId: string, metric: PointsMetric, period: Period, value: number) => void;
  rank: number;
  totalReps: number;
}

type MyStatsProps = MyTrackerStatsProps | MyPointsStatsProps;

const TRACKER_METRICS: { key: TrackerMetric; label: string; color: string }[] = [
  { key: 'dials', label: 'Dials', color: 'blue' },
  { key: 'pickUps', label: 'Pick Ups', color: 'emerald' },
  { key: 'sets', label: 'Sets', color: 'purple' },
];

const POINTS_METRICS: { key: PointsMetric; label: string; color: string }[] = [
  { key: 'dials', label: 'Dials (+1)', color: 'blue' },
  { key: 'dnc', label: 'DNC (-3)', color: 'red' },
  { key: 'notInterested', label: 'Not Interested (-1)', color: 'orange' },
  { key: 'sets', label: 'Sets (+10)', color: 'emerald' },
];

export default function MyStats(props: MyStatsProps) {
  const [period, setPeriod] = useState<Period>('morning');
  const { rep, rank, totalReps } = props;

  const rankColor = rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-orange-400' : 'text-slate-400';

  return (
    <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-xl animate-fade-in-scale overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-700/30 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-base font-bold text-white shadow-lg">
            {rep.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">{rep.name}</h3>
            <p className={`text-sm font-semibold ${rankColor}`}>
              #{rank} <span className="text-slate-600 font-normal">of {totalReps}</span>
            </p>
          </div>
        </div>
        {props.mode === 'points' && (
          <div className="text-right">
            <p className={`text-3xl font-black tabular-nums leading-none ${props.totalPoints >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {props.totalPoints}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">points</p>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* AM/PM Toggle */}
        <div className="flex bg-slate-900/80 rounded-xl p-1 mb-3">
          <button
            onClick={() => setPeriod('morning')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all btn-press ${
              period === 'morning'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            ☀️ Morning
          </button>
          <button
            onClick={() => setPeriod('afternoon')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all btn-press ${
              period === 'afternoon'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🌙 Afternoon
          </button>
        </div>

        {/* Metrics */}
        {props.mode === 'tracker'
          ? TRACKER_METRICS.map((m) => (
              <MetricEditor
                key={m.key}
                label={m.label}
                value={props.entry[m.key][period]}
                onIncrement={() => props.onIncrement(rep.id, m.key, period)}
                onDecrement={() => props.onDecrement(rep.id, m.key, period)}
                onSet={(v) => props.onSet(rep.id, m.key, period, v)}
                color={m.color}
              />
            ))
          : POINTS_METRICS.map((m) => (
              <MetricEditor
                key={m.key}
                label={m.label}
                value={props.entry[m.key][period]}
                onIncrement={() => props.onIncrement(rep.id, m.key, period)}
                onDecrement={() => props.onDecrement(rep.id, m.key, period)}
                onSet={(v) => props.onSet(rep.id, m.key, period, v)}
                color={m.color}
              />
            ))}

        {/* Totals */}
        <div className="mt-4 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-2">
          {props.mode === 'tracker'
            ? TRACKER_METRICS.map((m) => {
                const total = props.entry[m.key].morning + props.entry[m.key].afternoon;
                return (
                  <div key={m.key} className="text-center bg-slate-900/50 rounded-xl py-2.5 px-2">
                    <p className="text-xl font-black text-white tabular-nums">{total}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{m.label} total</p>
                  </div>
                );
              })
            : (
              <div className="col-span-3 grid grid-cols-4 gap-2">
                {POINTS_METRICS.map((m) => {
                  const total = props.entry[m.key].morning + props.entry[m.key].afternoon;
                  return (
                    <div key={m.key} className="text-center bg-slate-900/50 rounded-xl py-2 px-1">
                      <p className="text-lg font-black text-white tabular-nums">{total}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{m.label.split(' ')[0]}</p>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
