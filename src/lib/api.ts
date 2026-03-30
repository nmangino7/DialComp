import { CompetitionState } from './types';

export async function fetchState(date: string): Promise<CompetitionState | null> {
  try {
    const res = await fetch(`/api/state?date=${date}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.state ?? null;
  } catch {
    return null;
  }
}

export async function pushState(state: CompetitionState): Promise<boolean> {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
