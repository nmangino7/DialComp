'use client';

import { Rep, PointsEntry } from '@/lib/types';
import { calculatePoints, POINT_VALUES } from '@/lib/points';

interface ProfileModalProps {
  rep: Rep | null;
  entry: PointsEntry | null;
  rank: number | null;
  arenaStats?: { hp: number; maxHp: number; kills: number; deaths: number; weapon: { icon: string; name: string; dmg: number } };
  achievements?: string[];
  onClose: () => void;
}

const WEAPON_TIERS = [
  { pts: 0,   icon: '\u{1F44A}', name: 'Fists' },
  { pts: 5,   icon: '\u{1F5E1}️', name: 'Dagger' },
  { pts: 10,  icon: '\u{2694}️', name: 'Sword' },
  { pts: 20,  icon: '\u{1FA93}', name: 'Axe' },
  { pts: 35,  icon: '\u{1F3F9}', name: 'Bow' },
  { pts: 50,  icon: '\u{1F531}', name: 'Trident' },
  { pts: 75,  icon: '\u{1F6E1}️', name: 'Shield' },
  { pts: 100, icon: '\u{1F451}', name: 'Crown' },
];

export default function ProfileModal({ rep, entry, rank, arenaStats, achievements = [], onClose }: ProfileModalProps) {
  if (!rep || !entry) return null;

  const points = calculatePoints(entry);
  const dialsTotal = entry.dials.morning + entry.dials.afternoon;
  const dncTotal = entry.dnc.morning + entry.dnc.afternoon;
  const niTotal = entry.notInterested.morning + entry.notInterested.afternoon;
  const setsTotal = entry.sets.morning + entry.sets.afternoon;
  const unlockedWeapons = WEAPON_TIERS.filter((w) => Math.max(0, points) >= w.pts);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-stone-900 via-slate-900 to-stone-900 border-2 border-amber-900/50 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-700/30 to-red-700/30 border-b border-amber-900/50 px-5 py-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white text-lg font-bold"
          >
            ×
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0">
              {rep.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-widest">Gladiator</p>
              <h2 className="text-2xl font-extrabold text-white truncate">{rep.name}</h2>
              {rank !== null && (
                <p className="text-sm font-semibold text-amber-300">
                  Rank #{rank}
                  <span className={`ml-2 ${points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {points} pts
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Stats grid */}
          <div>
            <h3 className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-2">Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Dials" value={dialsTotal} note={`+${POINT_VALUES.dials} ea`} color="text-blue-400" />
              <StatCard label="Sets" value={setsTotal} note={`+${POINT_VALUES.sets} ea`} color="text-emerald-400" />
              <StatCard label="DNC" value={dncTotal} note={`${POINT_VALUES.dnc} ea`} color="text-red-400" />
              <StatCard label="Not Int." value={niTotal} note={`${POINT_VALUES.notInterested} ea`} color="text-orange-400" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <BreakdownCard label="Morning" entry={entry} period="morning" />
              <BreakdownCard label="Afternoon" entry={entry} period="afternoon" />
            </div>
          </div>

          {/* Battle stats */}
          {arenaStats && (
            <div>
              <h3 className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-2">Arena</h3>
              <div className="bg-stone-800/60 rounded-xl border border-amber-900/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{arenaStats.weapon.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{arenaStats.weapon.name}</p>
                    <p className="text-[10px] text-stone-500">{arenaStats.weapon.dmg} damage per hit</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-stone-500 w-8">HP</span>
                  <div className="flex-1 h-2 bg-stone-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (arenaStats.hp / arenaStats.maxHp) > 0.6 ? 'bg-emerald-500' :
                        (arenaStats.hp / arenaStats.maxHp) > 0.3 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(arenaStats.hp / arenaStats.maxHp) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {Math.round(arenaStats.hp)}/{arenaStats.maxHp}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-stone-900/50 rounded-lg p-2 text-center">
                    <p className="text-2xl font-black text-emerald-400 tabular-nums">{arenaStats.kills}</p>
                    <p className="text-[10px] uppercase tracking-wider text-stone-500">Kills</p>
                  </div>
                  <div className="bg-stone-900/50 rounded-lg p-2 text-center">
                    <p className="text-2xl font-black text-red-400 tabular-nums">{arenaStats.deaths}</p>
                    <p className="text-[10px] uppercase tracking-wider text-stone-500">Deaths</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weapons unlocked */}
          <div>
            <h3 className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-2">Arsenal</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {WEAPON_TIERS.map((w) => {
                const unlocked = unlockedWeapons.some((u) => u.pts === w.pts);
                return (
                  <div
                    key={w.pts}
                    className={`rounded-lg p-2 text-center border transition-all ${
                      unlocked
                        ? 'bg-amber-900/20 border-amber-600/40'
                        : 'bg-stone-900/40 border-stone-800/50 opacity-30'
                    }`}
                  >
                    <div className="text-xl">{w.icon}</div>
                    <p className="text-[9px] text-stone-400 font-semibold mt-0.5">{w.name}</p>
                    <p className="text-[8px] text-stone-600">{w.pts}+ pts</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-2">
                Achievements ({achievements.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {achievements.map((a, i) => (
                  <span
                    key={i}
                    className="text-xs bg-amber-900/30 border border-amber-600/30 rounded-md px-2 py-1 text-amber-300 font-semibold"
                  >
                    {'\u{1F3C6}'} {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, note, color }: { label: string; value: number; note: string; color: string }) {
  return (
    <div className="bg-stone-800/60 rounded-xl border border-amber-900/20 p-3">
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{label}</p>
      <p className="text-[10px] text-stone-600">{note}</p>
    </div>
  );
}

function BreakdownCard({ label, entry, period }: { label: string; entry: PointsEntry; period: 'morning' | 'afternoon' }) {
  const total =
    entry.dials[period] +
    entry.dnc[period] +
    entry.notInterested[period] +
    entry.sets[period];
  return (
    <div className="bg-stone-900/40 rounded-lg border border-stone-800/50 p-2 text-center">
      <p className="text-[9px] uppercase tracking-wider text-stone-500 font-semibold">{label}</p>
      <p className="text-base font-bold text-white tabular-nums">{total}</p>
      <p className="text-[9px] text-stone-600">total events</p>
    </div>
  );
}
