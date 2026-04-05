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

export async function sendAction(
  date: string,
  action: { type: string; [key: string]: unknown },
): Promise<CompetitionState | null> {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, action }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.state ?? null;
  } catch {
    return null;
  }
}
