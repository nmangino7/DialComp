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

// Weapon tiers — damage + speed
const WEAPON_TIERS = [
  { pts: 0,   icon: '👊', name: 'Fists',    dmg: 2,  speed: 6,  tier: 0 },
  { pts: 5,   icon: '🗡️', name: 'Dagger',   dmg: 4,  speed: 8,  tier: 1 },
  { pts: 10,  icon: '⚔️', name: 'Sword',    dmg: 6,  speed: 9,  tier: 2 },
  { pts: 20,  icon: '🪓', name: 'Axe',      dmg: 9,  speed: 10, tier: 3 },
  { pts: 35,  icon: '🏹', name: 'Bow',      dmg: 12, speed: 12, tier: 4 },
  { pts: 50,  icon: '🔱', name: 'Trident',  dmg: 16, speed: 14, tier: 5 },
  { pts: 75,  icon: '🛡️', name: 'Shield',   dmg: 20, speed: 16, tier: 6 },
  { pts: 100, icon: '👑', name: 'Crown',    dmg: 30, speed: 19, tier: 7 },
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
  retreatTimer: number;
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
  isMiss?: boolean;
  isKill?: boolean;
}

interface ClashEffect {
  id: number;
  x: number;
  y: number;
  timer: number;
}

interface BloodParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number;
  size: number;
}

interface WastedEvent {
  victimName: string;
  killerName: string;
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
  const bloodRef = useRef<BloodParticle[]>([]);
  const popupIdRef = useRef(0);
  const [, forceUpdate] = useState(0);
  const animRef = useRef<number>(0);
  const [charMap, setCharMap] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [wasted, setWasted] = useState<WastedEvent | null>(null);

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
          retreatTimer: 0,
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

  // Wasted timer
  useEffect(() => {
    if (!wasted) return;
    const interval = setInterval(() => {
      setWasted((w) => {
        if (!w) return null;
        const next = w.timer - 0.05;
        return next <= 0 ? null : { ...w, timer: next };
      });
    }, 50);
    return () => clearInterval(interval);
  }, [wasted?.victimName]);

  // Helper: find nearest alive enemy
  const findNearest = (id: string, map: Map<string, FighterState>): string | null => {
    let bestId: string | null = null;
    let bestDist = Infinity;
    const myPos = map.get(id);
    if (!myPos) return null;
    fighters.forEach((o) => {
      if (o.id === id) return;
      const op = map.get(o.id);
      if (!op || op.hp <= 0) return;
      const dx = op.x - myPos.x;
      const dy = op.y - myPos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; bestId = o.id; }
    });
    return bestId;
  };

  // Spawn blood
  const spawnBlood = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      bloodRef.current.push({
        id: popupIdRef.current++,
        x, y,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 30 - 10,
        timer: 1.2 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
      });
    }
  };

  // Main game loop
  useEffect(() => {
    const map = positionsRef.current;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update popups
      popupsRef.current = popupsRef.current
        .map((p) => ({ ...p, timer: p.timer - dt, y: p.y - 25 * dt }))
        .filter((p) => p.timer > 0);

      // Update clashes
      clashesRef.current = clashesRef.current
        .map((c) => ({ ...c, timer: c.timer - dt }))
        .filter((c) => c.timer > 0);

      // Update blood particles
      bloodRef.current = bloodRef.current
        .map((b) => ({
          ...b,
          timer: b.timer - dt,
          x: b.x + b.vx * dt,
          y: b.y + b.vy * dt,
          vy: b.vy + 20 * dt, // gravity
        }))
        .filter((b) => b.timer > 0);

      fighters.forEach((f) => {
        const pos = map.get(f.id);
        if (!pos) return;

        // Dead — respawn at edge after 4s
        if (pos.hp <= 0) {
          pos.deathTimer += dt;
          if (pos.deathTimer > 4) {
            pos.hp = f.maxHp;
            pos.deathTimer = 0;
            pos.attackTarget = null;
            pos.respawnTimer = 0.6;
            pos.retreatTimer = 0;
            // Respawn at a random edge
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) { pos.x = 5; pos.y = 15 + Math.random() * 70; }
            else if (edge === 1) { pos.x = 95; pos.y = 15 + Math.random() * 70; }
            else if (edge === 2) { pos.x = 10 + Math.random() * 80; pos.y = 8; }
            else { pos.x = 10 + Math.random() * 80; pos.y = 90; }
          }
          return;
        }

        if (pos.respawnTimer > 0) { pos.respawnTimer -= dt; return; }
        if (pos.hitTimer > 0) pos.hitTimer -= dt;
        pos.attackCooldown -= dt;

        // SEPARATION FORCE — push away from nearby fighters
        fighters.forEach((o) => {
          if (o.id === f.id) return;
          const op = map.get(o.id);
          if (!op || op.hp <= 0) return;
          const sx = pos.x - op.x;
          const sy = pos.y - op.y;
          const sDist = Math.sqrt(sx * sx + sy * sy);
          if (sDist < 12 && sDist > 0.1) {
            const push = (12 - sDist) * 0.3 * dt * 10;
            pos.x += (sx / sDist) * push;
            pos.y += (sy / sDist) * push;
          }
        });

        // RETREAT after attacking
        if (pos.retreatTimer > 0) {
          pos.retreatTimer -= dt;
          const dx = pos.targetX - pos.x;
          const dy = pos.targetY - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 2) {
            pos.x += (dx / dist) * f.weapon.speed * 0.8 * dt;
            pos.y += (dy / dist) * f.weapon.speed * 0.8 * dt;
            pos.facing = dx > 0 ? 'right' : 'left';
          }
          pos.x = Math.max(3, Math.min(97, pos.x));
          pos.y = Math.max(5, Math.min(92, pos.y));
          return; // don't chase while retreating
        }

        // TARGET SELECTION — find nearest, switch often
        const targetDead = pos.attackTarget && (() => {
          const tp = map.get(pos.attackTarget!);
          return !tp || tp.hp <= 0;
        })();
        if (!pos.attackTarget || targetDead || Math.random() < 0.03 * dt * 60) {
          const nearestId = findNearest(f.id, map);
          if (nearestId) pos.attackTarget = nearestId;
        }

        // CHASE target
        if (pos.attackTarget) {
          const tp = map.get(pos.attackTarget);
          if (tp && tp.hp > 0) {
            pos.targetX = tp.x;
            pos.targetY = tp.y;
          } else {
            pos.attackTarget = null;
            pos.targetX = 10 + Math.random() * 80;
            pos.targetY = 15 + Math.random() * 70;
          }
        }

        const dx = pos.targetX - pos.x;
        const dy = pos.targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 2) {
          pos.x += (dx / dist) * f.weapon.speed * dt;
          pos.y += (dy / dist) * f.weapon.speed * dt;
          pos.facing = dx > 0 ? 'right' : 'left';
        }

        // ATTACK
        if (pos.attackTarget && pos.attackCooldown <= 0) {
          const tp = map.get(pos.attackTarget);
          if (tp && tp.hp > 0) {
            const adx = tp.x - pos.x;
            const ady = tp.y - pos.y;
            const aDist = Math.sqrt(adx * adx + ady * ady);

            if (aDist < 9) {
              // Miss chance: 20% base, -3% per tier advantage
              const targetFighter = fighters.find((o) => o.id === pos.attackTarget);
              const tierDiff = f.weapon.tier - (targetFighter?.weapon.tier || 0);
              const missChance = Math.max(0.02, 0.20 - tierDiff * 0.03);

              if (Math.random() < missChance) {
                // MISS!
                popupsRef.current.push({
                  id: popupIdRef.current++,
                  x: tp.x + (Math.random() - 0.5) * 4,
                  y: tp.y - 4,
                  dmg: 0, timer: 0.7, crit: false, isMiss: true,
                });
                pos.attackCooldown = 0.5;
              } else {
                // HIT!
                const isCrit = Math.random() < 0.12;
                const damage = isCrit ? f.dmg * 2 : f.dmg;
                tp.hp = Math.max(0, tp.hp - damage);
                tp.hitTimer = 0.3;
                pos.attackCooldown = 0.7 + Math.random() * 0.5;

                // Blood!
                spawnBlood(tp.x, tp.y, isCrit ? 6 : 3);

                // Damage popup
                popupsRef.current.push({
                  id: popupIdRef.current++,
                  x: tp.x + (Math.random() - 0.5) * 3,
                  y: tp.y - 5,
                  dmg: damage, timer: 1.0, crit: isCrit,
                });

                // Clash effect
                clashesRef.current.push({
                  id: popupIdRef.current++,
                  x: (pos.x + tp.x) / 2,
                  y: (pos.y + tp.y) / 2,
                  timer: 0.3,
                });

                // Knockback (big)
                const kn = 8;
                tp.x = Math.max(3, Math.min(97, tp.x + (adx / (aDist || 1)) * kn));
                tp.y = Math.max(5, Math.min(92, tp.y + (ady / (aDist || 1)) * kn));

                // RETREAT after hitting — back off opposite direction
                const retreatDist = 15 + Math.random() * 10;
                pos.targetX = Math.max(5, Math.min(95, pos.x - (adx / (aDist || 1)) * retreatDist));
                pos.targetY = Math.max(8, Math.min(90, pos.y - (ady / (aDist || 1)) * retreatDist));
                pos.retreatTimer = 0.8 + Math.random() * 0.4;

                // KILL
                if (tp.hp <= 0) {
                  pos.kills += 1;
                  tp.deaths += 1;
                  tp.lastKiller = f.id;
                  pos.attackTarget = null;
                  spawnBlood(tp.x, tp.y, 10); // extra blood on kill

                  // WASTED overlay
                  const victimName = fighters.find((o) => o.id === tp.lastKiller ? false : o.id === pos.attackTarget || (tp === map.get(o.id)))?.name;
                  const killedFighter = fighters.find((o) => { const op = map.get(o.id); return op === tp; });
                  setWasted({
                    killerName: f.name,
                    victimName: killedFighter?.name || '???',
                    timer: 2.5,
                  });

                  popupsRef.current.push({
                    id: popupIdRef.current++,
                    x: tp.x, y: tp.y - 8,
                    dmg: 0, timer: 2.0, crit: false, isKill: true,
                  });
                }
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
          height: Math.max(500, fighters.length * 18 + 300),
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
            <span className={`font-black text-sm tabular-nums ${
              p.isKill ? 'text-red-500 text-lg' :
              p.isMiss ? 'text-slate-500 text-xs italic' :
              p.crit ? 'text-amber-300 text-base' : 'text-red-400'
            }`}>
              {p.isKill ? '☠️ KILL!' : p.isMiss ? 'MISS' : `${p.crit ? '💥' : ''}-${p.dmg}`}
            </span>
          </div>
        ))}

        {/* Blood particles */}
        {bloodRef.current.map((b) => (
          <div
            key={b.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              backgroundColor: `rgba(${180 + Math.random() * 40}, 20, 20, ${b.timer / 1.5})`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        {/* WASTED overlay */}
        {wasted && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ backgroundColor: `rgba(0, 0, 0, ${Math.min(0.6, wasted.timer * 0.3)})` }}
          >
            <p
              className="text-red-600 font-black tracking-[0.3em] uppercase"
              style={{
                fontSize: 'clamp(2rem, 10vw, 4rem)',
                transform: 'rotate(-3deg)',
                textShadow: '0 0 30px rgba(200,0,0,0.5), 0 0 60px rgba(200,0,0,0.3)',
                opacity: Math.min(1, wasted.timer * 2),
                fontFamily: 'Impact, Arial Black, sans-serif',
              }}
            >
              WASTED
            </p>
            <p className="text-red-400/80 text-sm font-bold mt-2" style={{ opacity: Math.min(1, wasted.timer * 2) }}>
              {wasted.killerName} killed {wasted.victimName}
            </p>
          </div>
        )}

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
