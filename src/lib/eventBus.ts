'use client';

// Simple event bus for cross-component events (achievements, feed, sounds, confetti)

export type AppEventType =
  | 'set_scored'        // someone scored a set
  | 'big_set_run'       // 3+ sets in a row
  | 'rank_up'           // rep moved up in rank
  | 'took_lead'         // rep took #1
  | 'kill'              // arena kill
  | 'achievement'       // achievement unlocked
  | 'powerup_collected' // arena powerup pickup
  | 'click'             // ui click for sound
  | 'increment'         // +1 sound
  | 'milestone';        // round number milestone (10/25/50/100 pts)

export interface AppEvent {
  type: AppEventType;
  message: string;
  repId?: string;
  repName?: string;
  victimName?: string;
  weapon?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  id: number;
}

type Listener = (event: AppEvent) => void;

let listeners: Listener[] = [];
let nextId = 1;

export function emit(event: Omit<AppEvent, 'timestamp' | 'id'>) {
  const full: AppEvent = {
    ...event,
    timestamp: Date.now(),
    id: nextId++,
  };
  listeners.forEach((l) => {
    try { l(full); } catch { /* ignore listener errors */ }
  });
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
