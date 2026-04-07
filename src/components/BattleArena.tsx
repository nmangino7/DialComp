'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Rep, PointsEntry } from '@/lib/types';
import { calculatePoints } from '@/lib/points';

interface BattleArenaProps {
  reps: Rep[];
  entries: PointsEntry[];
  participantIds: string[];
  myRepId: string | null;
}

// Available characters to pick
const CHARACTERS = [
  { id: 'knight', emoji: '🤺', name: 'Knight' },
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon' },
  { id: 'wolf', emoji: '🐺', name: 'Wolf' },
  { id: 'eagle', emoji: '🦅', name: 'Eagle' },
  { id: 'bear', emoji: '🐻', name: 'Bear' },
  { id: 'gorilla', emoji: '🦍', name: 'Gorilla' },
  { id: 'shark', emoji: '🦈', name: 'Shark' },
  { id: 'ninja', emoji: '🥷', name: 'Ninja' },
  { id: 'robot', emoji: '🤖', name: 'Robot' },
  { id: 'alien', emoji: '👽', name: 'Alien' },
  { id: 'skull', emoji: '💀', name: 'Reaper' },
];

const DEFAULT_CHAR = '⚔️';

// Weapon tiers — each adds damage
const WEAPON_TIERS = [
  { pts: 0,   icon: '👊', name: 'Fists',    dmg: 2 },
  { pts: 5,   icon: '🗡️', name: 'Dagger',   dmg: 4 },
  { pts: 10,  icon: '⚔️', name: 'Sword',    dmg: 6 },
  { pts: 20,  icon: '🪓', name: 'Axe',      dmg: 9 },
  { pts: 35,  icon: '🏹', name: 'Bow',      dmg: 12 },
  { pts: 50,  icon: '🔱', name: 'Trident',  dmg: 16 },
  { pts: 75,  icon: '🛡️', name: 'Shield',   dmg: 20 },
  { pts: 100, icon: '👑', name: 'Crown',    dmg: 30 },
];

function getWeapon(points: number) {
  let best = WEAPON_TIERS[0];
  for (const w of WEAPON_TIERS) {
    if (points >= w.pts) best = w;
  }
  return best;
}

function getTitle(kills: number): string {
  if (kills >= 50) return 'God of War';
  if (kills >= 35) return 'Champion';
  if (kills >= 25) return 'Warlord';
  if (kills >= 15) return 'Gladiator';
  if (kills >= 10) return 'Warrior';
  if (kills >= 5) return 'Fighter';
  if (kills >= 2) return 'Brawler';
  if (kills >= 1) return 'Recruit';
  return 'Peasant';
}

interface FighterState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 'left' | 'right';
  hp: number;
  maxHp: number;
  attackCooldown: number;
  attackTarget: string | null;
  hitTimer: number;
  deathTimer: number;
  respawnTimer: number;
  kills: number;
  deaths: number;
  lastKiller: string | null;
}

interface DamagePopup {
  id: number;
  x: number;
  y: number;
  dmg: number;
  timer: number;
  crit: boolean;
}

interface ClashEffect {
  id: number;
  x: number;
  y: number;
  timer: number;
}

const CHAR_STORAGE_KEY = 'dial-comp-characters';

function loadCharacters(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CHAR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCharacters(chars: Record<string, string>) {
  try { localStorage.setItem(CHAR_STORAGE_KEY, JSON.stringify(chars)); } catch { /* */ }
}

export default function BattleArena({ reps, entries, participantIds, myRepId }: BattleArenaProps) {
  const positionsRef = useRef<Map<string, FighterState>>(new Map());
  const popupsRef = useRef<DamagePopup[]>([]);
  const clashesRef = useRef<ClashEffect[]>([]);
  const popupIdRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const animRef = useRef<number>(0);
  const [charMap, setCharMap] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);

  // Load character selections
  useEffect(() => {
    setCharMap(loadCharacters());
  }, []);

  const pickCharacter = useCallback((charId: string) => {
    if (!myRepId) return;
    const updated = { ...charMap, [myRepId]: charId };
    setCharMap(updated);
    saveCharacters(updated);
    setShowPicker(false);
  }, [myRepId, charMap]);

  // Build fighter data
  const activeEntries = entries.filter((e) => participantIds.includes(e.repId));
  const sorted = [...activeEntries]
    .map((e) => ({ ...e, points: calculatePoints(e) }))
    .sort((a, b) => b.points - a.points);

  const maxPoints = Math.max(1, sorted.length > 0 ? sorted[0].points : 1);

  const fighters = sorted.map((e, idx) => {
    const rep = reps.find((r) => r.id === e.repId);
    const pts = Math.max(0, e.points);
    const weapon = getWeapon(pts);
    const pos = positionsRef.current.get(e.repId);
    const kills = pos?.kills || 0;
    const deaths = pos?.deaths || 0;
    return {
      id: e.repId,
      name: rep?.name || '???',
      points: e.points,
      weapon,
      title: getTitle(kills),
      rank: idx + 1,
      maxHp: 50 + pts * 3,
      dmg: weapon.dmg,
      kills,
      deaths,
      charEmoji: (() => {
        const cid = charMap[e.repId];
        const c = CHARACTERS.find((ch) => ch.id === cid);
        return c ? c.emoji : DEFAULT_CHAR;
      })(),
    };
  });

  // Init positions
  useEffect(() => {
    const map = positionsRef.current;
    fighters.forEach((f) => {
      if (!map.has(f.id)) {
        map.set(f.id, {
          x: 8 + Math.random() * 84,
          y: 12 + Math.random() * 76,
          targetX: 8 + Math.random() * 84,
          targetY: 12 + Math.random() * 76,
          facing: Math.random() > 0.5 ? 'right' : 'left',
          hp: f.maxHp,
          maxHp: f.maxHp,
          attackCooldown: Math.random() * 1.5,
          attackTarget: null,
          hitTimer: 0,
          deathTimer: 0,
          respawnTimer: 0,
          kills: 0,
          deaths: 0,
          lastKiller: null,
        });
      } else {
        // Update max HP if points changed
        const pos = map.get(f.id)!;
        pos.maxHp = f.maxHp;
        if (pos.hp > f.maxHp) pos.hp = f.maxHp;
      }
    });
  }, [fighters.length, maxPoints]);

  // Main game loop
  useEffect(() => {
    const map = positionsRef.current;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update damage popups
      popupsRef.current = popupsRef.current
        .map((p) => ({ ...p, timer: p.timer - dt, y: p.y - 30 * dt }))
        .filter((p) => p.timer > 0);

      // Update clash effects
      clashesRef.current = clashesRef.current
        .map((c) => ({ ...c, timer: c.timer - dt }))
        .filter((c) => c.timer > 0);

      fighters.forEach((f) => {
        const pos = map.get(f.id);
        if (!pos) return;

        // Dead — respawn after 4s
        if (pos.hp <= 0) {
          pos.deathTimer += dt;
          if (pos.deathTimer > 4) {
            pos.hp = f.maxHp;
            pos.deathTimer = 0;
            pos.x = 8 + Math.random() * 84;
            pos.y = 12 + Math.random() * 76;
            pos.attackTarget = null;
            pos.respawnTimer = 0.5;
          }
          return;
        }

        if (pos.respawnTimer > 0) {
          pos.respawnTimer -= dt;
          return;
        }

        if (pos.hitTimer > 0) pos.hitTimer -= dt;
        pos.attackCooldown -= dt;

        // Always find someone to fight
        if (!pos.attackTarget || Math.random() < 0.01) {
          const aliveOthers = fighters.filter((o) => {
            const op = map.get(o.id);
            return o.id !== f.id && op && op.hp > 0;
          });
          if (aliveOthers.length > 0) {
            // Prefer attacking nearby enemies or weaker ones
            const target = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
            pos.attackTarget = target.id;
            const tp = map.get(target.id);
            if (tp) {
              pos.targetX = tp.x;
              pos.targetY = tp.y;
            }
          }
        }

        // Move toward target — chase aggressively
        if (pos.attackTarget) {
          const tp = map.get(pos.attackTarget);
          if (tp && tp.hp > 0) {
            pos.targetX = tp.x;
            pos.targetY = tp.y;
          } else {
            pos.attackTarget = null;
          }
        }

        const dx = pos.targetX - pos.x;
        const dy = pos.targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 12 + f.rank * 0.3;

        if (dist > 3) {
          pos.x += (dx / dist) * speed * dt;
          pos.y += (dy / dist) * speed * dt;
          pos.facing = dx > 0 ? 'right' : 'left';
        }

        // ATTACK when close enough and cooldown ready
        if (pos.attackTarget && pos.attackCooldown <= 0) {
          const tp = map.get(pos.attackTarget);
          if (tp && tp.hp > 0) {
            const adx = tp.x - pos.x;
            const ady = tp.y - pos.y;
            const aDist = Math.sqrt(adx * adx + ady * ady);

            if (aDist < 8) {
              // HIT!
              const isCrit = Math.random() < 0.15;
              const damage = isCrit ? f.dmg * 2 : f.dmg;
              tp.hp = Math.max(0, tp.hp - damage);
              tp.hitTimer = 0.25;
              pos.attackCooldown = 0.8 + Math.random() * 0.4;

              // Damage popup
              popupsRef.current.push({
                id: popupIdRef.current++,
                x: tp.x,
                y: tp.y - 5,
                dmg: damage,
                timer: 1.0,
                crit: isCrit,
              });

              // Clash effect
              clashesRef.current.push({
                id: popupIdRef.current++,
                x: (pos.x + tp.x) / 2,
                y: (pos.y + tp.y) / 2,
                timer: 0.3,
              });

              // Knock back slightly
              const knockX = adx / (aDist || 1) * 3;
              const knockY = ady / (aDist || 1) * 3;
              tp.x = Math.max(3, Math.min(97, tp.x + knockX));
              tp.y = Math.max(5, Math.min(92, tp.y + knockY));

              // KILL — credit the attacker
              if (tp.hp <= 0) {
                pos.kills += 1;
                tp.deaths += 1;
                tp.lastKiller = f.id;
                pos.attackTarget = null;

                // Kill popup
                popupsRef.current.push({
                  id: popupIdRef.current++,
                  x: pos.x,
                  y: pos.y - 8,
                  dmg: 0,
                  timer: 1.5,
                  crit: true,
                });
              }
            }
          }
        }

        pos.x = Math.max(3, Math.min(97, pos.x));
        pos.y = Math.max(5, Math.min(92, pos.y));
      });

      forceUpdate((n) => n + 1);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [fighters.length, maxPoints]);

  const myChar = myRepId ? charMap[myRepId] : null;
  const myCharObj = CHARACTERS.find((c) => c.id === myChar);

  if (fighters.length === 0) {
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
      {/* Character Picker */}
      {myRepId && (
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-full py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700/80 transition-all btn-press flex items-center justify-center gap-2"
        >
          <span className="text-2xl">{myCharObj?.emoji || DEFAULT_CHAR}</span>
          <span className="text-sm font-bold text-slate-300">
            {myCharObj ? `Your fighter: ${myCharObj.name}` : 'Choose your fighter!'}
          </span>
          <span className="text-xs text-slate-500">tap to change</span>
        </button>
      )}

      {showPicker && (
        <div className="bg-slate-800/90 rounded-xl border border-amber-500/30 p-4 animate-fade-in-scale">
          <h3 className="text-center text-sm font-bold text-amber-300 uppercase tracking-widest mb-3">
            &#9876;&#65039; Choose Your Fighter
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCharacter(c.id)}
                className={`py-3 rounded-xl transition-all btn-press flex flex-col items-center gap-1 ${
                  myChar === c.id
                    ? 'bg-amber-600/30 border-2 border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/60 border border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-3xl">{c.emoji}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Arena */}
      <div
        className="relative w-full rounded-2xl border-2 border-amber-900/40 overflow-hidden select-none"
        style={{
          height: Math.max(420, fighters.length * 20 + 250),
          background: 'radial-gradient(ellipse at center, #1a1207 0%, #0c0a04 50%, #0f172a 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #b45309 0%, transparent 70%)',
        }} />
        <div className="absolute top-3 left-0 right-0 text-center">
          <p className="text-amber-800/30 text-[10px] font-bold uppercase tracking-[0.4em]">
            &#9876;&#65039; The Arena &#9876;&#65039;
          </p>
        </div>

        {/* Clash effects */}
        {clashesRef.current.map((c) => (
          <div
            key={c.id}
            className="absolute text-2xl pointer-events-none"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: c.timer / 0.3,
              filter: `brightness(${1 + c.timer * 3})`,
            }}
          >
            💥
          </div>
        ))}

        {/* Damage popups */}
        {popupsRef.current.map((p) => (
          <div
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: p.timer,
            }}
          >
            <span className={`font-black text-sm tabular-nums ${p.crit ? 'text-amber-300 text-base' : 'text-red-400'}`}>
              {p.dmg === 0 ? '☠️ KILL!' : `${p.crit ? '💥' : ''}-${p.dmg}`}
            </span>
          </div>
        ))}

        {/* Fighters */}
        {fighters.map((f) => {
          const pos = positionsRef.current.get(f.id);
          if (!pos) return null;

          const isDead = pos.hp <= 0;
          const isHit = pos.hitTimer > 0;
          const isRespawning = pos.respawnTimer > 0;
          const hpPct = pos.maxHp > 0 ? (pos.hp / pos.maxHp) * 100 : 0;
          const size = f.rank === 1 ? 1.25 : f.rank === 2 ? 1.12 : f.rank === 3 ? 1.05 : 0.92;
          const isMe = f.id === myRepId;

          // Determine character emoji
          const cid = charMap[f.id];
          const charObj = CHARACTERS.find((c) => c.id === cid);
          const emoji = charObj ? charObj.emoji : DEFAULT_CHAR;

          return (
            <div
              key={f.id}
              className="absolute"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) scale(${size}) ${pos.facing === 'left' ? 'scaleX(-1)' : ''}`,
                zIndex: Math.round(pos.y) + (isMe ? 100 : 0),
                filter: isDead ? 'grayscale(1) brightness(0.4)' : isHit ? 'brightness(1.8) saturate(2)' : isRespawning ? 'brightness(2)' : undefined,
                transition: 'filter 0.1s',
                opacity: isDead ? 0.5 : 1,
              }}
            >
              <div className="flex flex-col items-center" style={{ transform: pos.facing === 'left' ? 'scaleX(-1)' : undefined }}>
                {/* Name + HP number */}
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md mb-0.5 whitespace-nowrap ${
                  isMe ? 'bg-blue-500/30' :
                  f.rank === 1 ? 'bg-amber-500/30' :
                  'bg-slate-800/70'
                }`}>
                  <span className={`text-[9px] font-bold ${
                    isMe ? 'text-blue-300' :
                    f.rank === 1 ? 'text-amber-300' :
                    f.rank === 2 ? 'text-slate-300' :
                    f.rank === 3 ? 'text-orange-300' :
                    'text-slate-400'
                  }`}>
                    {f.name}
                  </span>
                  {!isDead && (
                    <span className={`text-[9px] font-black tabular-nums ${
                      hpPct > 60 ? 'text-emerald-400' : hpPct > 30 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {Math.round(pos.hp)}
                    </span>
                  )}
                </div>

                {/* HP bar */}
                {!isDead && (
                  <div className="w-12 h-1.5 bg-slate-900 rounded-full mb-0.5 overflow-hidden border border-slate-700/50">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        hpPct > 60 ? 'bg-emerald-500' : hpPct > 30 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                )}

                {/* Weapon above */}
                <div className="text-xs leading-none mb-0.5">
                  {f.weapon.icon}
                </div>

                {/* Character body */}
                <div className={`text-2xl leading-none ${
                  !isDead && pos.attackTarget ? 'animate-bounce' : ''
                }`} style={{ animationDuration: '0.5s' }}>
                  {isDead ? '💀' : emoji}
                </div>

                {/* Points badge */}
                <div className={`text-[8px] font-black tabular-nums mt-0.5 px-1 rounded ${
                  f.points >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                }`}>
                  {f.points}pts
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weapon Legend */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-slate-700/50" />
          Weapons &amp; Damage
          <span className="h-px flex-1 bg-slate-700/50" />
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {WEAPON_TIERS.map((w) => (
            <div key={w.pts} className="py-2 px-1 rounded-lg bg-slate-900/50">
              <div className="text-xl">{w.icon}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{w.name}</div>
              <div className="text-[10px] text-red-400 font-bold">{w.dmg} dmg</div>
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
        <div className="space-y-1.5">
          {fighters.map((f) => {
            const pos = positionsRef.current.get(f.id);
            const isDead = pos ? pos.hp <= 0 : false;
            const hp = pos ? Math.round(pos.hp) : f.maxHp;
            const hpPct = pos ? (pos.hp / pos.maxHp) * 100 : 100;
            const cid = charMap[f.id];
            const charObj = CHARACTERS.find((c) => c.id === cid);
            const emoji = charObj ? charObj.emoji : DEFAULT_CHAR;
            const isMe = f.id === myRepId;

            return (
              <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isMe ? 'bg-blue-500/10 border border-blue-500/20' :
                isDead ? 'bg-slate-900/20 opacity-50' : 'bg-slate-900/40'
              }`}>
                <span className="text-lg">{isDead ? '💀' : emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${
                    isMe ? 'text-blue-300' :
                    f.rank === 1 ? 'text-amber-300' : isDead ? 'text-slate-500' : 'text-white'
                  }`}>
                    {f.name} {isMe && <span className="text-[10px] text-blue-500">(you)</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {f.title} · {f.weapon.icon} {f.weapon.name} ({f.weapon.dmg}dmg) ·
                    <span className="text-emerald-500"> {f.kills}K</span>
                    <span className="text-red-500">/{f.deaths}D</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          hpPct > 60 ? 'bg-emerald-500' : hpPct > 30 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(0, hpPct)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold tabular-nums w-8 text-right ${
                      isDead ? 'text-red-500' : 'text-slate-300'
                    }`}>
                      {isDead ? 'KO' : hp}
                    </span>
                  </div>
                  <p className={`text-[10px] font-bold tabular-nums ${
                    f.points >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {f.points} pts
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
