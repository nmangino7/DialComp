import { CompetitionState } from './types';
import { STORAGE_KEY } from './constants';

export function loadState(): CompetitionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CompetitionState;
  } catch {
    return null;
  }
}

export function saveState(state: CompetitionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}
