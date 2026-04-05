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
}

type MyStatsProps = MyTrackerStatsProps | MyPointsStatsProps;

const TRACKER_METRICS: { key: TrackerMetric; label: string; color: string }[] = [
  { key: 'dials', label: 'Dials', color: 'blue' },
  { key: 'pickUps', label: 'Pick Ups', color: 'emerald' },
  { key: 'sets', label: 'Sets', color: 'purple' },
];

const POINTS_METRICS: { key: PointsMetric; label: string; color: string }[] = [
  { key: 'dials', label: 'Dials (+1 pt)', color: 'blue' },
  { key: 'dnc', label: 'DNC (-3 pts)', color: 'red' },
  { key: 'notInterested', label: 'Not Interested (-1 pt)', color: 'orange' },
  { key: 'sets', label: 'Sets (+10 pts)', color: 'emerald' },
];

export default function MyStats(props: MyStatsProps) {
  const [period, setPeriod] = useState<Period>('morning');
  const { rep, rank } = props;

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
            {rep.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{rep.name}</h3>
            <p className="text-xs text-slate-400">Rank #{rank}</p>
          </div>
        </div>
        {props.mode === 'points' && (
          <div className={`text-2xl font-black tabular-nums ${props.totalPoints >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {props.totalPoints} pts
          </div>
        )}
      </div>

      {/* AM/PM Toggle */}
      <div className="flex bg-slate-900 rounded-lg p-1 mb-3">
        <button
          onClick={() => setPeriod('morning')}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
            period === 'morning'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Morning
        </button>
        <button
          onClick={() => setPeriod('afternoon')}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
            period === 'afternoon'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Afternoon
        </button>
      </div>

      {/* Metrics */}
      <div className="divide-y divide-slate-700/50">
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
      </div>

      {/* Totals summary */}
      <div className="mt-3 pt-3 border-t border-slate-700 flex gap-3 flex-wrap">
        {props.mode === 'tracker'
          ? TRACKER_METRICS.map((m) => {
              const total = props.entry[m.key].morning + props.entry[m.key].afternoon;
              return (
                <div key={m.key} className="text-center flex-1 min-w-[60px]">
                  <p className="text-lg font-bold text-white tabular-nums">{total}</p>
                  <p className="text-xs text-slate-500">{m.label}</p>
                </div>
              );
            })
          : POINTS_METRICS.map((m) => {
              const total = props.entry[m.key].morning + props.entry[m.key].afternoon;
              return (
                <div key={m.key} className="text-center flex-1 min-w-[60px]">
                  <p className="text-lg font-bold text-white tabular-nums">{total}</p>
                  <p className="text-xs text-slate-500">{m.label.split(' ')[0]}</p>
                </div>
              );
            })}
      </div>
    </div>
  );
}
