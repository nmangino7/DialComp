'use client';

import { emit } from './eventBus';

const KEY = 'dial-comp-achievements';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  firstSet:        { id: 'firstSet',        title: 'First Blood',         description: 'Score your first set',                icon: '\u{1FA78}' },
  fiveSets:        { id: 'fiveSets',        title: 'On Fire',             description: 'Score 5 sets in one day',             icon: '\u{1F525}' },
  tenSets:         { id: 'tenSets',         title: 'Set Machine',         description: 'Score 10 sets in one day',            icon: '\u{2699}️' },
  twentyFiveSets:  { id: 'twentyFiveSets',  title: 'Closer',              description: 'Score 25 sets in one day',            icon: '\u{1F4A5}' },
  hundredDials:    { id: 'hundredDials',    title: 'Phone Warrior',       description: 'Make 100 dials',                      icon: '\u{260E}️' },
  twoFiftyDials:   { id: 'twoFiftyDials',   title: 'Dial God',            description: 'Make 250 dials',                      icon: '\u{1F4DE}' },
  fiveHundredDials:{ id: 'fiveHundredDials',title: 'Phone Hero',          description: 'Make 500 dials',                      icon: '\u{1F1F8}' },
  tookLead:        { id: 'tookLead',        title: 'Champion',            description: 'Take #1 on the leaderboard',           icon: '\u{1F451}' },
  fifty:           { id: 'fifty',           title: 'Half Century',        description: 'Reach 50 points',                     icon: '\u{1F947}' },
  hundred:         { id: 'hundred',         title: 'Centurion',           description: 'Reach 100 points',                    icon: '\u{1F3C6}' },
  twoHundred:      { id: 'twoHundred',      title: 'Legend',              description: 'Reach 200 points',                    icon: '\u{1F31F}' },
  firstKill:       { id: 'firstKill',       title: 'First Kill',          description: 'Win your first arena duel',           icon: '\u{2620}️' },
  fiveKills:       { id: 'fiveKills',       title: 'Killing Spree',       description: 'Get 5 arena kills',                   icon: '\u{2694}️' },
  tenKills:        { id: 'tenKills',        title: 'Slayer',              description: 'Get 10 arena kills',                  icon: '\u{1F5E1}️' },
  twentyKills:     { id: 'twentyKills',     title: 'Gladiator',           description: 'Get 20 arena kills',                  icon: '\u{1F947}' },
  fiftyKills:      { id: 'fiftyKills',      title: 'God of War',          description: 'Get 50 arena kills',                  icon: '\u{26A1}' },
  powerupCollect:  { id: 'powerupCollect',  title: 'Loot Goblin',         description: 'Collect a power-up in the arena',     icon: '\u{2728}' },
};

function loadUnlocked(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveUnlocked(set: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify(Array.from(set))); } catch { /* */ }
}

let unlocked: Set<string> | null = null;

export function isUnlocked(id: string): boolean {
  if (!unlocked) unlocked = loadUnlocked();
  return unlocked.has(id);
}

export function getUnlocked(): string[] {
  if (!unlocked) unlocked = loadUnlocked();
  return Array.from(unlocked);
}

export function unlock(id: string) {
  if (!unlocked) unlocked = loadUnlocked();
  if (unlocked.has(id)) return false;
  const ach = ACHIEVEMENTS[id];
  if (!ach) return false;
  unlocked.add(id);
  saveUnlocked(unlocked);
  emit({
    type: 'achievement',
    message: ach.title,
    data: { description: ach.description, icon: ach.icon, id },
  });
  return true;
}

// Check stats and unlock relevant achievements. Returns array of newly unlocked IDs.
export function checkStatsAchievements(stats: {
  totalSets: number;
  totalDials: number;
  totalPoints: number;
  isLeader: boolean;
}): string[] {
  const newly: string[] = [];
  const u = (id: string) => { if (unlock(id)) newly.push(id); };

  if (stats.totalSets >= 1) u('firstSet');
  if (stats.totalSets >= 5) u('fiveSets');
  if (stats.totalSets >= 10) u('tenSets');
  if (stats.totalSets >= 25) u('twentyFiveSets');
  if (stats.totalDials >= 100) u('hundredDials');
  if (stats.totalDials >= 250) u('twoFiftyDials');
  if (stats.totalDials >= 500) u('fiveHundredDials');
  if (stats.totalPoints >= 50) u('fifty');
  if (stats.totalPoints >= 100) u('hundred');
  if (stats.totalPoints >= 200) u('twoHundred');
  if (stats.isLeader) u('tookLead');

  return newly;
}

export function checkArenaAchievements(stats: {
  kills: number;
  collectedPowerup?: boolean;
}): string[] {
  const newly: string[] = [];
  const u = (id: string) => { if (unlock(id)) newly.push(id); };

  if (stats.kills >= 1) u('firstKill');
  if (stats.kills >= 5) u('fiveKills');
  if (stats.kills >= 10) u('tenKills');
  if (stats.kills >= 20) u('twentyKills');
  if (stats.kills >= 50) u('fiftyKills');
  if (stats.collectedPowerup) u('powerupCollect');

  return newly;
}
