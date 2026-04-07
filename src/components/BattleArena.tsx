'use client';

import { useEffect, useRef, useState } from 'react';
import { Rep, PointsEntry } from '@/lib/types';
import { calculatePoints } from '@/lib/points';

interface BattleArenaProps {
  reps: Rep[];
  entries: PointsEntry[];
  participantIds: string[];
}

// Weapon progression based on total points
function getWeapons(points: number): string[] {
  const weapons: string[] = [];
  if (points >= 0) weapons.push('👊');
  if (points >= 5) weapons.push('🗡️');
  if (points >= 10) weapons.push('⚔️');
  if (points >= 20) weapons.push('🪓');
  if (points >= 35) weapons.push('🏹');
  if (points >= 50) weapons.push('🔱');
  if (points >= 75) weapons.push('🛡️');
  if (points >= 100) weapons.push('👑');
  return weapons;
}

function getTitle(points: number): string {
  if (points >= 100) return 'Champion';
  if (points >= 75) return 'Warlord';
  if (points >= 50) return 'Gladiator';
  if (points >= 35) return 'Warrior';
  if (points >= 20) return 'Fighter';
  if (points >= 10) return 'Brawler';
  if (points >= 5) return 'Recruit';
  return 'Peasant';
}

interface Gladiator {
  id: string;
  name: string;
  points: number;
  weapons: string[];
  title: string;
  rank: number;
  alive: boolean;
}

interface GladiatorPos {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 'left' | 'right';
  state: 'idle' | 'walking' | 'attacking' | 'dead';
  attackTarget: string | null;
  hitTimer: number;
}

export default function BattleArena({ reps, entries, participantIds }: BattleArenaProps) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Map<string, GladiatorPos>>(new Map());
  const [, forceUpdate] = useState(0);
  const animRef = useRef<number>(0);

  // Build gladiator data
  const activeEntries = entries.filter((e) => participantIds.includes(e.repId));
  const sorted = [...activeEntries]
    .map((e) => ({ ...e, points: calculatePoints(e) }))
    .sort((a, b) => b.points - a.points);

  const maxPoints = sorted.length > 0 ? sorted[0].points : 0;

  const gladiators: Gladiator[] = sorted.map((e, idx) => {
    const rep = reps.find((r) => r.id === e.repId);
    const pts = e.points;
    return {
      id: e.repId,
      name: rep?.name || '???',
      points: pts,
      weapons: getWeapons(pts),
      title: getTitle(pts),
      rank: idx + 1,
      alive: pts > 0 || idx === 0 || (maxPoints <= 0),
    };
  });

  // Initialize positions for new gladiators
  useEffect(() => {
    const map = positionsRef.current;
    gladiators.forEach((g) => {
      if (!map.has(g.id)) {
        map.set(g.id, {
          x: 10 + Math.random() * 80,
          y: 15 + Math.random() * 70,
          targetX: 10 + Math.random() * 80,
          targetY: 15 + Math.random() * 70,
          facing: Math.random() > 0.5 ? 'right' : 'left',
          state: 'idle',
          attackTarget: null,
          hitTimer: 0,
        });
      }
    });
  }, [gladiators.length]);

  // Animation loop
  useEffect(() => {
    const map = positionsRef.current;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      gladiators.forEach((g) => {
        const pos = map.get(g.id);
        if (!pos) return;

        if (!g.alive) {
          pos.state = 'dead';
          return;
        }

        // Decrease hit timer
        if (pos.hitTimer > 0) pos.hitTimer -= dt;

        // Move toward target
        const dx = pos.targetX - pos.x;
        const dy = pos.targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 8 + g.rank * 0.5; // top players move slightly faster

        if (dist > 1.5) {
          pos.x += (dx / dist) * speed * dt;
          pos.y += (dy / dist) * speed * dt;
          pos.facing = dx > 0 ? 'right' : 'left';
          pos.state = 'walking';
        } else {
          pos.state = 'idle';
          // Pick new random target
          if (Math.random() < 0.02) {
            // Sometimes chase another gladiator
            const others = gladiators.filter((o) => o.id !== g.id && o.alive);
            if (others.length > 0 && Math.random() < 0.4) {
              const target = others[Math.floor(Math.random() * others.length)];
              const tp = map.get(target.id);
              if (tp) {
                pos.targetX = tp.x + (Math.random() - 0.5) * 10;
                pos.targetY = tp.y + (Math.random() - 0.5) * 10;
                pos.attackTarget = target.id;
              }
            } else {
              pos.targetX = 5 + Math.random() * 90;
              pos.targetY = 10 + Math.random() * 80;
              pos.attackTarget = null;
            }
          }
        }

        // Check if near attack target
        if (pos.attackTarget) {
          const targetPos = map.get(pos.attackTarget);
          if (targetPos) {
            const adx = targetPos.x - pos.x;
            const ady = targetPos.y - pos.y;
            const aDist = Math.sqrt(adx * adx + ady * ady);
            if (aDist < 6) {
              pos.state = 'attacking';
              targetPos.hitTimer = 0.3;
              // Bounce back
              pos.targetX = pos.x + (Math.random() - 0.5) * 30;
              pos.targetY = pos.y + (Math.random() - 0.5) * 20;
              pos.targetX = Math.max(5, Math.min(95, pos.targetX));
              pos.targetY = Math.max(10, Math.min(90, pos.targetY));
              pos.attackTarget = null;
            }
          }
        }

        // Clamp position
        pos.x = Math.max(3, Math.min(97, pos.x));
        pos.y = Math.max(5, Math.min(92, pos.y));
      });

      forceUpdate((n) => n + 1);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [gladiators.length, maxPoints]);

  if (gladiators.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="text-6xl mb-4">&#9876;&#65039;</div>
        <p className="text-slate-400 font-bold text-xl">No Warriors in the Arena</p>
        <p className="text-slate-600 text-sm mt-2">Join the Points tab to enter battle</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Arena */}
      <div
        ref={arenaRef}
        className="relative w-full rounded-2xl border-2 border-amber-900/40 overflow-hidden"
        style={{
          height: Math.max(400, gladiators.length * 25 + 200),
          background: 'radial-gradient(ellipse at center, #1a1207 0%, #0c0a04 50%, #0f172a 100%)',
        }}
      >
        {/* Arena floor pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #b45309 0%, transparent 70%)',
        }} />

        {/* Arena text */}
        <div className="absolute top-3 left-0 right-0 text-center">
          <p className="text-amber-800/40 text-xs font-bold uppercase tracking-[0.3em]">
            &#9876;&#65039; The Arena &#9876;&#65039;
          </p>
        </div>

        {/* Gladiators */}
        {gladiators.map((g) => {
          const pos = positionsRef.current.get(g.id);
          if (!pos) return null;

          const size = g.rank === 1 ? 1.3 : g.rank === 2 ? 1.15 : g.rank === 3 ? 1.05 : 0.9;
          const isHit = pos.hitTimer > 0;
          const latestWeapon = g.weapons[g.weapons.length - 1];

          return (
            <div
              key={g.id}
              className="absolute transition-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) scale(${size}) ${pos.facing === 'left' ? 'scaleX(-1)' : ''}`,
                zIndex: Math.round(pos.y),
                filter: !g.alive ? 'grayscale(1) opacity(0.3)' : isHit ? 'brightness(2)' : undefined,
                transition: 'filter 0.1s',
              }}
            >
              {/* Attack slash effect */}
              {pos.state === 'attacking' && (
                <div className="absolute -top-2 -right-2 text-xl animate-pop">💥</div>
              )}

              {/* Character body */}
              <div className="flex flex-col items-center">
                {/* Name tag */}
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-0.5 whitespace-nowrap ${
                  g.rank === 1 ? 'bg-amber-500/30 text-amber-300' :
                  g.rank === 2 ? 'bg-slate-500/30 text-slate-300' :
                  g.rank === 3 ? 'bg-orange-500/30 text-orange-300' :
                  'bg-slate-800/60 text-slate-400'
                }`} style={{ transform: pos.facing === 'left' ? 'scaleX(-1)' : undefined }}>
                  {g.name}
                </div>

                {/* Weapons above head */}
                <div className="text-sm leading-none mb-0.5" style={{ transform: pos.facing === 'left' ? 'scaleX(-1)' : undefined }}>
                  {latestWeapon}
                </div>

                {/* Body - emoji gladiator */}
                <div className={`text-2xl leading-none ${
                  pos.state === 'walking' ? 'animate-bounce' :
                  pos.state === 'dead' ? 'rotate-90' : ''
                }`} style={{ animationDuration: '0.6s' }}>
                  {g.alive ? (g.rank === 1 ? '🦁' : '🏛️') : '💀'}
                </div>

                {/* Health bar */}
                {g.alive && (
                  <div className="w-10 h-1 bg-slate-800 rounded-full mt-0.5 overflow-hidden" style={{ transform: pos.facing === 'left' ? 'scaleX(-1)' : undefined }}>
                    <div
                      className={`h-full rounded-full ${
                        g.rank === 1 ? 'bg-amber-400' : g.rank <= 3 ? 'bg-emerald-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${maxPoints > 0 ? Math.max(10, (g.points / maxPoints) * 100) : 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weapon Legend */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-slate-700/50" />
          Weapon Progression
          <span className="h-px flex-1 bg-slate-700/50" />
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { pts: 0, icon: '👊', name: 'Fists' },
            { pts: 5, icon: '🗡️', name: 'Dagger' },
            { pts: 10, icon: '⚔️', name: 'Sword' },
            { pts: 20, icon: '🪓', name: 'Axe' },
            { pts: 35, icon: '🏹', name: 'Bow' },
            { pts: 50, icon: '🔱', name: 'Trident' },
            { pts: 75, icon: '🛡️', name: 'Shield' },
            { pts: 100, icon: '👑', name: 'Crown' },
          ].map((w) => (
            <div key={w.pts} className="py-2 px-1 rounded-lg bg-slate-900/50">
              <div className="text-xl">{w.icon}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{w.name}</div>
              <div className="text-[9px] text-slate-600">{w.pts}+ pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Warrior Stats */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-slate-700/50" />
          Warriors
          <span className="h-px flex-1 bg-slate-700/50" />
        </h3>
        <div className="space-y-2">
          {gladiators.map((g) => (
            <div key={g.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              g.alive ? 'bg-slate-900/40' : 'bg-slate-900/20 opacity-50'
            }`}>
              <span className="text-lg">{g.alive ? (g.rank === 1 ? '🦁' : '⚔️') : '💀'}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate ${
                  g.rank === 1 ? 'text-amber-300' : g.alive ? 'text-white' : 'text-slate-500'
                }`}>
                  {g.name}
                </p>
                <p className="text-[10px] text-slate-500">{g.title}</p>
              </div>
              <div className="flex gap-0.5 text-sm">
                {g.weapons.slice(-3).map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>
              <span className={`font-bold tabular-nums ${g.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {g.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
