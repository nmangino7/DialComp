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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendAction(date: string, action: Record<string, any>): Promise<CompetitionState | null> {
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
