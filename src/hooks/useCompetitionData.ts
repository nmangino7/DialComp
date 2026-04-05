'use client';

import { useReducer, useEffect, useState, useCallback, useRef } from 'react';
import {
  CompetitionState,
  TrackerEntry,
  PointsEntry,
  TrackerMetric,
  PointsMetric,
  Period,
} from '@/lib/types';
import { STORAGE_KEY, MY_REP_KEY } from '@/lib/constants';
import { fetchState, sendAction } from '@/lib/api';

function createTrackerEntry(repId: string): TrackerEntry {
  return {
    repId,
    dials: { morning: 0, afternoon: 0 },
    pickUps: { morning: 0, afternoon: 0 },
    sets: { morning: 0, afternoon: 0 },
  };
}

function createPointsEntry(repId: string): PointsEntry {
  return {
    repId,
    dials: { morning: 0, afternoon: 0 },
    dnc: { morning: 0, afternoon: 0 },
    notInterested: { morning: 0, afternoon: 0 },
    sets: { morning: 0, afternoon: 0 },
  };
}

function emptyState(): CompetitionState {
  return {
    reps: [],
    trackerEntries: [],
    pointsEntries: [],
    pointsParticipantIds: [],
    date: new Date().toISOString().split('T')[0],
  };
}

type Action =
  | { type: 'LOAD'; state: CompetitionState }
  | { type: 'INCREMENT_TRACKER'; repId: string; metric: TrackerMetric; period: Period }
  | { type: 'DECREMENT_TRACKER'; repId: string; metric: TrackerMetric; period: Period }
  | { type: 'SET_TRACKER'; repId: string; metric: TrackerMetric; period: Period; value: number }
  | { type: 'INCREMENT_POINTS'; repId: string; metric: PointsMetric; period: Period }
  | { type: 'DECREMENT_POINTS'; repId: string; metric: PointsMetric; period: Period }
  | { type: 'SET_POINTS'; repId: string; metric: PointsMetric; period: Period; value: number }
  | { type: 'ADD_REP'; name: string; id: string }
  | { type: 'TOGGLE_POINTS_PARTICIPANT'; repId: string }
  | { type: 'RESET_DAY' };

function reducer(state: CompetitionState, action: Action): CompetitionState {
  switch (action.type) {
    case 'LOAD':
      return action.state;

    case 'INCREMENT_TRACKER':
      return {
        ...state,
        trackerEntries: state.trackerEntries.map((e) =>
          e.repId === action.repId
            ? { ...e, [action.metric]: { ...e[action.metric], [action.period]: e[action.metric][action.period] + 1 } }
            : e
        ),
      };

    case 'DECREMENT_TRACKER':
      return {
        ...state,
        trackerEntries: state.trackerEntries.map((e) =>
          e.repId === action.repId
            ? { ...e, [action.metric]: { ...e[action.metric], [action.period]: Math.max(0, e[action.metric][action.period] - 1) } }
            : e
        ),
      };

    case 'SET_TRACKER':
      return {
        ...state,
        trackerEntries: state.trackerEntries.map((e) =>
          e.repId === action.repId
            ? { ...e, [action.metric]: { ...e[action.metric], [action.period]: Math.max(0, action.value) } }
            : e
        ),
      };

    case 'INCREMENT_POINTS':
      return {
        ...state,
        pointsEntries: state.pointsEntries.map((e) =>
          e.repId === action.repId
            ? { ...e, [action.metric]: { ...e[action.metric], [action.period]: e[action.metric][action.period] + 1 } }
            : e
        ),
      };

    case 'DECREMENT_POINTS':
      return {
        ...state,
        pointsEntries: state.pointsEntries.map((e) =>
          e.repId === action.repId
            ? { ...e, [action.metric]: { ...e[action.metric], [action.period]: Math.max(0, e[action.metric][action.period] - 1) } }
            : e
        ),
      };

    case 'SET_POINTS':
      return {
        ...state,
        pointsEntries: state.pointsEntries.map((e) =>
          e.repId === action.repId
            ? { ...e, [action.metric]: { ...e[action.metric], [action.period]: Math.max(0, action.value) } }
            : e
        ),
      };

    case 'ADD_REP': {
      const newRep = { id: action.id, name: action.name };
      return {
        ...state,
        reps: [...state.reps, newRep],
        trackerEntries: [...state.trackerEntries, createTrackerEntry(newRep.id)],
        pointsEntries: [...state.pointsEntries, createPointsEntry(newRep.id)],
        pointsParticipantIds: [...state.pointsParticipantIds, newRep.id],
      };
    }

    case 'TOGGLE_POINTS_PARTICIPANT': {
      const ids = state.pointsParticipantIds;
      return {
        ...state,
        pointsParticipantIds: ids.includes(action.repId)
          ? ids.filter((id) => id !== action.repId)
          : [...ids, action.repId],
      };
    }

    case 'RESET_DAY':
      return {
        ...state,
        trackerEntries: state.reps.map((r) => createTrackerEntry(r.id)),
        pointsEntries: state.reps.map((r) => createPointsEntry(r.id)),
        date: new Date().toISOString().split('T')[0],
      };

    default:
      return state;
  }
}

function dispatchAndSync(
  dispatch: React.Dispatch<Action>,
  stateRef: React.RefObject<CompetitionState>,
  action: Action,
) {
  dispatch(action);
  const date = stateRef.current.date;
  sendAction(date, action as unknown as { type: string; [key: string]: unknown });
}

export function useCompetitionData() {
  const [state, dispatch] = useReducer(reducer, null, emptyState);
  const [mounted, setMounted] = useState(false);
  const [myRepId, setMyRepIdState] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load myRepId from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(MY_REP_KEY);
    if (saved) setMyRepIdState(saved);
  }, []);

  // Load state from localStorage, then fetch from API
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    // localStorage for instant render
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as CompetitionState;
        if (saved.date === today) {
          dispatch({ type: 'LOAD', state: saved });
        }
      }
    } catch { /* ignore */ }

    setMounted(true);

    // Fetch from API
    fetchState(today).then((remote) => {
      if (remote) {
        dispatch({ type: 'LOAD', state: remote });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch { /* */ }
      } else {
        // Initialize empty state on server
        sendAction(today, { type: 'INIT', state: emptyState() });
      }
    });
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    if (mounted) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* */ }
    }
  }, [state, mounted]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(async () => {
      const today = new Date().toISOString().split('T')[0];
      const remote = await fetchState(today);
      if (remote && JSON.stringify(remote) !== JSON.stringify(stateRef.current)) {
        dispatch({ type: 'LOAD', state: remote });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [mounted]);

  const setMyRepId = useCallback((id: string) => {
    setMyRepIdState(id);
    localStorage.setItem(MY_REP_KEY, id);
  }, []);

  const fire = useCallback(
    (action: Action) => dispatchAndSync(dispatch, stateRef, action),
    [],
  );

  const incrementTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period) =>
      fire({ type: 'INCREMENT_TRACKER', repId, metric, period }),
    [fire],
  );

  const decrementTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period) =>
      fire({ type: 'DECREMENT_TRACKER', repId, metric, period }),
    [fire],
  );

  const setTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period, value: number) =>
      fire({ type: 'SET_TRACKER', repId, metric, period, value }),
    [fire],
  );

  const incrementPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period) =>
      fire({ type: 'INCREMENT_POINTS', repId, metric, period }),
    [fire],
  );

  const decrementPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period) =>
      fire({ type: 'DECREMENT_POINTS', repId, metric, period }),
    [fire],
  );

  const setPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period, value: number) =>
      fire({ type: 'SET_POINTS', repId, metric, period, value }),
    [fire],
  );

  const addRep = useCallback(
    (name: string) => {
      const id = crypto.randomUUID();
      fire({ type: 'ADD_REP', name, id });
      return id;
    },
    [fire],
  );

  const toggleParticipant = useCallback(
    (repId: string) => fire({ type: 'TOGGLE_POINTS_PARTICIPANT', repId }),
    [fire],
  );

  const resetDay = useCallback(() => fire({ type: 'RESET_DAY' }), [fire]);

  return {
    state,
    mounted,
    myRepId,
    setMyRepId,
    incrementTracker,
    decrementTracker,
    setTracker,
    incrementPoints,
    decrementPoints,
    setPoints,
    addRep,
    toggleParticipant,
    resetDay,
  };
}
