'use client';

import { useReducer, useEffect, useState, useCallback, useRef } from 'react';
import {
  CompetitionState,
  Rep,
  TrackerEntry,
  PointsEntry,
  TrackerMetric,
  PointsMetric,
  Period,
} from '@/lib/types';
import { DEFAULT_REP_NAMES } from '@/lib/constants';
import { loadState, saveState } from '@/lib/storage';
import { fetchState, sendAction } from '@/lib/api';

function createRep(name: string): Rep {
  return { id: crypto.randomUUID(), name };
}

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

function createInitialState(): CompetitionState {
  const reps = DEFAULT_REP_NAMES.map(createRep);
  return {
    reps,
    trackerEntries: reps.map((r) => createTrackerEntry(r.id)),
    pointsEntries: reps.map((r) => createPointsEntry(r.id)),
    pointsParticipantIds: reps.map((r) => r.id),
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

// Dispatch locally for instant UI, then send action to server
function useServerAction(
  dispatch: React.Dispatch<Action>,
  stateRef: React.RefObject<CompetitionState>,
) {
  return useCallback(
    (action: Action) => {
      // Apply locally for instant feedback
      dispatch(action);

      // Send action to server (fire-and-forget, server applies to its own copy)
      const date = stateRef.current.date;
      const { ...serverAction } = action;
      sendAction(date, serverAction);
    },
    [dispatch, stateRef],
  );
}

export function useCompetitionData() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [mounted, setMounted] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatchWithServer = useServerAction(dispatch, stateRef);

  // Load from localStorage immediately, then fetch from API
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    // Step 1: localStorage for instant render
    const saved = loadState();
    if (saved && saved.date === today) {
      dispatch({ type: 'LOAD', state: saved });
    }
    setMounted(true);

    // Step 2: Fetch from API (async)
    fetchState(today).then((remote) => {
      if (remote && remote.date === today) {
        dispatch({ type: 'LOAD', state: remote });
        saveState(remote);
      } else {
        // No server state yet — initialize it
        const initial = stateRef.current;
        sendAction(today, { type: 'INIT', state: initial });
      }
    });
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (mounted) {
      saveState(state);
    }
  }, [state, mounted]);

  // Poll for remote changes every 3 seconds
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(async () => {
      const today = new Date().toISOString().split('T')[0];
      const remote = await fetchState(today);
      if (remote && JSON.stringify(remote) !== JSON.stringify(stateRef.current)) {
        dispatch({ type: 'LOAD', state: remote });
        saveState(remote);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [mounted]);

  const incrementTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period) =>
      dispatchWithServer({ type: 'INCREMENT_TRACKER', repId, metric, period }),
    [dispatchWithServer]
  );

  const decrementTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period) =>
      dispatchWithServer({ type: 'DECREMENT_TRACKER', repId, metric, period }),
    [dispatchWithServer]
  );

  const setTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period, value: number) =>
      dispatchWithServer({ type: 'SET_TRACKER', repId, metric, period, value }),
    [dispatchWithServer]
  );

  const incrementPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period) =>
      dispatchWithServer({ type: 'INCREMENT_POINTS', repId, metric, period }),
    [dispatchWithServer]
  );

  const decrementPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period) =>
      dispatchWithServer({ type: 'DECREMENT_POINTS', repId, metric, period }),
    [dispatchWithServer]
  );

  const setPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period, value: number) =>
      dispatchWithServer({ type: 'SET_POINTS', repId, metric, period, value }),
    [dispatchWithServer]
  );

  const addRep = useCallback(
    (name: string) => {
      const id = crypto.randomUUID();
      dispatchWithServer({ type: 'ADD_REP', name, id });
    },
    [dispatchWithServer]
  );

  const toggleParticipant = useCallback(
    (repId: string) =>
      dispatchWithServer({ type: 'TOGGLE_POINTS_PARTICIPANT', repId }),
    [dispatchWithServer]
  );

  const resetDay = useCallback(
    () => dispatchWithServer({ type: 'RESET_DAY' }),
    [dispatchWithServer]
  );

  return {
    state,
    mounted,
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
