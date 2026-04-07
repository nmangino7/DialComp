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
  { id: 'knight', emoji: '\u{1F93A}', name: 'Knight' },
  { id: 'lion', emoji: '\u{1F981}', name: 'Lion' },
  { id: 'dragon', emoji: '\u{1F409}', name: 'Dragon' },
  { id: 'wolf', emoji: '\u{1F43A}', name: 'Wolf' },
  { id: 'eagle', emoji: '\u{1F985}', name: 'Eagle' },
  { id: 'bear', emoji: '\u{1F43B}', name: 'Bear' },
  { id: 'gorilla', emoji: '\u{1F98D}', name: 'Gorilla' },
  { id: 'shark', emoji: '\u{1F988}', name: 'Shark' },
  { id: 'ninja', emoji: '\u{1F977}', name: 'Ninja' },
  { id: 'robot', emoji: '\u{1F916}', name: 'Robot' },
  { id: 'alien', emoji: '\u{1F47D}', name: 'Alien' },
  { id: 'skull', emoji: '\u{1F480}', name: 'Reaper' },
];

const DEFAULT_CHAR = '\u2694\uFE0F';

// Weapon tiers: each adds damage and speed
const WEAPON_TIERS = [
  { pts: 0,   icon: '\u{1F44A}', name: 'Fists',    dmg: 2,  speed: 6 },
  { pts: 5,   icon: '\u{1F5E1}\uFE0F', name: 'Dagger',   dmg: 4,  speed: 7 },
  { pts: 10,  icon: '\u2694\uFE0F', name: 'Sword',    dmg: 6,  speed: 8 },
  { pts: 20,  icon: '\u{1FA93}', name: 'Axe',      dmg: 9,  speed: 9 },
  { pts: 35,  icon: '\u{1F3F9}', name: 'Bow',      dmg: 12, speed: 11 },
  { pts: 50,  icon: '\u{1F531}', name: 'Trident',  dmg: 16, speed: 13 },
  { pts: 75,  icon: '\u{1F6E1}\uFE0F', name: 'Shield',   dmg: 20, speed: 15 },
  { pts: 100, icon: '\u{1F451}', name: 'Crown',    dmg: 30, speed: 18 },
];

function getWeapon(points: number) {
  let best = WEAPON_TIERS[0];
  for (const w of WEAPON_TIERS) {
    if (points >= w.pts) best = w;
  }
  return best;
}

function getWeaponTierIndex(points: number): number {
  let idx = 0;
  for (let i = 0; i < WEAPON_TIERS.length; i++) {
    if (points >= WEAPON_TIERS[i].pts) idx = i;
  }
  return idx;
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
  retreatTimer: number;
  state: 'chasing' | 'attacking' | 'retreating' | 'wandering' | 'dead';
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

function spawnEdgePosition(): { x: number; y: number } {
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: return { x: 5 + Math.random() * 90, y: 5 };
    case 1: return { x: 5 + Math.random() * 90, y: 95 };
    case 2: return { x: 5, y: 5 + Math.random() * 90 };
    case 3:
    default: return { x: 95, y: 5 + Math.random() * 90 };
  }
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
  const wastedRef = useRef<WastedEvent | null>(null);

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
    const tierIndex = getWeaponTierIndex(pts);
    const pos = positionsRef.current.get(e.repId);
    const kills = pos?.kills || 0;
    const deaths = pos?.deaths || 0;
    return {
      id: e.repId,
      name: rep?.name || '???',
      points: e.points,
      weapon,
      tierIndex,
      title: getTitle(kills),
      rank: idx + 1,
      maxHp: 50 + pts * 3,
      dmg: weapon.dmg,
      speed: weapon.speed,
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
        const edge = spawnEdgePosition();
        map.set(f.id, {
          x: edge.x,
          y: edge.y,
          targetX: 20 + Math.random() * 60,
          targetY: 20 + Math.random() * 60,
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
          retreatTimer: 0,
          state: 'wandering',
        });
      } else {
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

      // Update blood particles
      bloodRef.current = bloodRef.current
        .map((b) => ({
          ...b,
          x: b.x + b.vx * dt,
          y: b.y + b.vy * dt,
          vy: b.vy + 15 * dt,
          timer: b.timer - dt,
        }))
        .filter((b) => b.timer > 0);

      // Update wasted overlay
      if (wastedRef.current) {
        wastedRef.current = { ...wastedRef.current, timer: wastedRef.current.timer - dt };
        if (wastedRef.current.timer <= 0) {
          wastedRef.current = null;
        }
      }

      fighters.forEach((f) => {
        const pos = map.get(f.id);
        if (!pos) return;

        // Dead: respawn after 4s at edge
        if (pos.hp <= 0) {
          pos.state = 'dead';
          pos.deathTimer += dt;
          if (pos.deathTimer > 4) {
            pos.hp = f.maxHp;
            pos.deathTimer = 0;
            const edge = spawnEdgePosition();
            pos.x = edge.x;
            pos.y = edge.y;
            pos.attackTarget = null;
            pos.respawnTimer = 0.5;
            pos.retreatTimer = 0;
            pos.state = 'wandering';
          }
          return;
        }

        if (pos.respawnTimer > 0) {
          pos.respawnTimer -= dt;
          return;
        }

        if (pos.hitTimer > 0) pos.hitTimer -= dt;
        pos.attackCooldown -= dt;

        // SEPARATION FORCE: push away from nearby fighters
        fighters.forEach((other) => {
          if (other.id === f.id) return;
          const otherPos = map.get(other.id);
          if (!otherPos || otherPos.hp <= 0) return;
          const sdx = pos.x - otherPos.x;
          const sdy = pos.y - otherPos.y;
          const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sDist < 12 && sDist > 0.01) {
            const pushStrength = (12 - sDist) * 0.5;
            pos.x += (sdx / sDist) * pushStrength * dt;
            pos.y += (sdy / sDist) * pushStrength * dt;
          } else if (sDist <= 0.01) {
            pos.x += (Math.random() - 0.5) * 2;
            pos.y += (Math.random() - 0.5) * 2;
          }
        });

        // Handle retreating state
        if (pos.state === 'retreating') {
          pos.retreatTimer -= dt;
          const rdx = pos.targetX - pos.x;
          const rdy = pos.targetY - pos.y;
          const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
          if (rDist > 1) {
            pos.x += (rdx / rDist) * f.speed * dt;
            pos.y += (rdy / rDist) * f.speed * dt;
            pos.facing = rdx > 0 ? 'right' : 'left';
          }
          if (pos.retreatTimer <= 0) {
            pos.state = 'chasing';
            pos.retreatTimer = 0;
          }
          pos.x = Math.max(3, Math.min(97, pos.x));
          pos.y = Math.max(5, Math.min(95, pos.y));
          return;
        }

        // TARGET SELECTION: prefer nearest alive enemy, 5% switch chance per frame
        const currentTarget = pos.attackTarget ? map.get(pos.attackTarget) : null;
        const targetIsDead = currentTarget ? currentTarget.hp <= 0 : false;
        if (!pos.attackTarget || targetIsDead || Math.random() < 0.05) {
          let nearestId: string | null = null;
          let nearestDist = Infinity;
          fighters.forEach((o) => {
            if (o.id === f.id) return;
            const op = map.get(o.id);
            if (!op || op.hp <= 0) return;
            const ndx = op.x - pos.x;
            const ndy = op.y - pos.y;
            const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
            if (nDist < nearestDist) {
              nearestDist = nDist;
              nearestId = o.id;
            }
          });
          if (nearestId) {
            pos.attackTarget = nearestId;
            pos.state = 'chasing';
          }
        }

        // Move toward target
        if (pos.attackTarget) {
          const tp = map.get(pos.attackTarget);
          if (tp && tp.hp > 0) {
            pos.targetX = tp.x;
            pos.targetY = tp.y;
          } else {
            pos.attackTarget = null;
            pos.state = 'wandering';
          }
        }

        const dx = pos.targetX - pos.x;
        const dy = pos.targetY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 3) {
          pos.x += (dx / dist) * f.speed * dt;
          pos.y += (dy / dist) * f.speed * dt;
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
              pos.state = 'attacking';

              // Tier comparison for miss chance
              const targetFighter = fighters.find((tf) => tf.id === pos.attackTarget);
              const tierAdvantage = f.tierIndex - (targetFighter?.tierIndex || 0);
              const missChance = Math.max(0.02, 0.20 - tierAdvantage * 0.03);

              if (Math.random() < missChance) {
                // MISS!
                popupsRef.current.push({
                  id: popupIdRef.current++,
                  x: tp.x,
                  y: tp.y - 5,
                  dmg: 0,
                  timer: 0.8,
                  crit: false,
                  isMiss: true,
                });
                pos.attackCooldown = 0.5;
              } else {
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

                // Blood particles (3-5)
                const bloodCount = 3 + Math.floor(Math.random() * 3);
                for (let bi = 0; bi < bloodCount; bi++) {
                  const angle = Math.random() * Math.PI * 2;
                  const spd = 2 + Math.random() * 6;
                  bloodRef.current.push({
                    id: popupIdRef.current++,
                    x: tp.x,
                    y: tp.y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    timer: 1.5,
                    size: 0.5 + Math.random() * 1.0,
                  });
                }

                // Knockback 8 units
                const knockNorm = aDist || 1;
                const knockX = (adx / knockNorm) * 8;
                const knockY = (ady / knockNorm) * 8;
                tp.x = Math.max(3, Math.min(97, tp.x + knockX));
                tp.y = Math.max(5, Math.min(95, tp.y + knockY));

                // RETREAT after hit: move 15-25 units away from victim
                const retreatDist = 15 + Math.random() * 10;
                pos.targetX = Math.max(3, Math.min(97, pos.x - (adx / knockNorm) * retreatDist));
                pos.targetY = Math.max(5, Math.min(95, pos.y - (ady / knockNorm) * retreatDist));
                pos.retreatTimer = 1.0;
                pos.state = 'retreating';

                // KILL
                if (tp.hp <= 0) {
                  pos.kills += 1;
                  tp.deaths += 1;
                  tp.lastKiller = f.id;
                  pos.attackTarget = null;

                  // Extra blood on kill
                  for (let bi = 0; bi < 5; bi++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = 3 + Math.random() * 8;
                    bloodRef.current.push({
                      id: popupIdRef.current++,
                      x: tp.x,
                      y: tp.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      timer: 1.5,
                      size: 0.8 + Math.random() * 1.5,
                    });
                  }

                  // Kill popup
                  popupsRef.current.push({
                    id: popupIdRef.current++,
                    x: pos.x,
                    y: pos.y - 8,
                    dmg: 0,
                    timer: 1.5,
                    crit: true,
                    isKill: true,
                  });

                  // WASTED overlay
                  const killedFighter = fighters.find((o) => {
                    const op = map.get(o.id);
                    return op === tp;
                  });
                  wastedRef.current = {
                    victimName: killedFighter?.name || '???',
                    killerName: f.name,
                    timer: 3.0,
                  };
                }
              }
            }
          }
        }

        pos.x = Math.max(3, Math.min(97, pos.x));
        pos.y = Math.max(5, Math.min(95, pos.y));
      });

      forceUpdate((n) => n + 1);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [fighters.length, maxPoints]);

  const myChar = myRepId ? charMap[myRepId] : null;
  const myCharObj = CHARACTERS.find((c) => c.id === myChar);
  const wastedEvent = wastedRef.current;
  const wastedOpacity = wastedEvent
    ? (wastedEvent.timer > 2.5 ? (3.0 - wastedEvent.timer) * 2 : wastedEvent.timer < 0.5 ? wastedEvent.timer * 2 : 1)
    : 0;

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
          height: Math.max(500, fighters.length * 20 + 250),
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

        {/* Blood particles */}
        {bloodRef.current.map((b) => (
          <div
            key={b.id}
            className="absolute w-1.5 h-1.5 rounded-full bg-red-600 pointer-events-none"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: b.timer / 1.5,
              width: `${b.size * 6}px`,
              height: `${b.size * 6}px`,
            }}
          />
        ))}

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
            {'\u{1F4A5}'}
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
            {p.isMiss ? (
              <span className="font-black text-sm text-slate-400">MISS</span>
            ) : p.isKill ? (
              <span className="font-black text-base text-amber-300">{'\u2620\uFE0F'} KILL!</span>
            ) : (
              <span className={`font-black text-sm tabular-nums ${p.crit ? 'text-amber-300 text-base' : 'text-red-400'}`}>
                {p.crit ? '\u{1F4A5}' : ''}-{p.dmg}
              </span>
            )}
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
                  {isDead ? '\u{1F480}' : emoji}
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

        {/* WASTED Overlay */}
        {wastedEvent && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${0.6 * wastedOpacity})`,
              opacity: wastedOpacity,
              zIndex: 200,
            }}
          >
            <div
              className="text-6xl font-black text-red-600 tracking-[0.3em] uppercase"
              style={{
                fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
                transform: 'rotate(-3deg)',
                textShadow: '0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.3)',
              }}
            >
              WASTED
            </div>
            <div className="text-sm text-slate-300 mt-3 font-bold" style={{ transform: 'rotate(-3deg)' }}>
              {wastedEvent.killerName} killed {wastedEvent.victimName}
            </div>
          </div>
        )}
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
                <span className="text-lg">{isDead ? '\u{1F480}' : emoji}</span>
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
