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
import { fetchState, pushState } from '@/lib/api';

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
  | { type: 'INCREMENT_POINTS'; repId: string; metric: PointsMetric; period: Period }
  | { type: 'DECREMENT_POINTS'; repId: string; metric: PointsMetric; period: Period }
  | { type: 'ADD_REP'; name: string }
  | { type: 'TOGGLE_POINTS_PARTICIPANT'; repId: string }
  | { type: 'RESET_DAY' };

function reducer(state: CompetitionState, action: Action): CompetitionState {
  switch (action.type) {
    case 'LOAD':
      return action.state;

    case 'INCREMENT_TRACKER': {
      return {
        ...state,
        trackerEntries: state.trackerEntries.map((e) =>
          e.repId === action.repId
            ? {
                ...e,
                [action.metric]: {
                  ...e[action.metric],
                  [action.period]: e[action.metric][action.period] + 1,
                },
              }
            : e
        ),
      };
    }

    case 'DECREMENT_TRACKER': {
      return {
        ...state,
        trackerEntries: state.trackerEntries.map((e) =>
          e.repId === action.repId
            ? {
                ...e,
                [action.metric]: {
                  ...e[action.metric],
                  [action.period]: Math.max(0, e[action.metric][action.period] - 1),
                },
              }
            : e
        ),
      };
    }

    case 'INCREMENT_POINTS': {
      return {
        ...state,
        pointsEntries: state.pointsEntries.map((e) =>
          e.repId === action.repId
            ? {
                ...e,
                [action.metric]: {
                  ...e[action.metric],
                  [action.period]: e[action.metric][action.period] + 1,
                },
              }
            : e
        ),
      };
    }

    case 'DECREMENT_POINTS': {
      return {
        ...state,
        pointsEntries: state.pointsEntries.map((e) =>
          e.repId === action.repId
            ? {
                ...e,
                [action.metric]: {
                  ...e[action.metric],
                  [action.period]: Math.max(0, e[action.metric][action.period] - 1),
                },
              }
            : e
        ),
      };
    }

    case 'ADD_REP': {
      const rep = createRep(action.name);
      return {
        ...state,
        reps: [...state.reps, rep],
        trackerEntries: [...state.trackerEntries, createTrackerEntry(rep.id)],
        pointsEntries: [...state.pointsEntries, createPointsEntry(rep.id)],
        pointsParticipantIds: [...state.pointsParticipantIds, rep.id],
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

    case 'RESET_DAY': {
      return {
        ...state,
        trackerEntries: state.reps.map((r) => createTrackerEntry(r.id)),
        pointsEntries: state.reps.map((r) => createPointsEntry(r.id)),
        date: new Date().toISOString().split('T')[0],
      };
    }

    default:
      return state;
  }
}

export function useCompetitionData() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [mounted, setMounted] = useState(false);
  const stateRef = useRef(state);
  const isPollingUpdate = useRef(false);

  // Keep stateRef current
  stateRef.current = state;

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
      }
    });
  }, []);

  // Persist to localStorage + push to API on every local change
  useEffect(() => {
    if (!mounted) return;

    // Skip pushing to API if this change came from polling
    if (isPollingUpdate.current) {
      isPollingUpdate.current = false;
      return;
    }

    saveState(state);
    pushState(state); // fire-and-forget
  }, [state, mounted]);

  // Poll for remote changes every 5 seconds
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(async () => {
      const today = new Date().toISOString().split('T')[0];
      const remote = await fetchState(today);
      if (remote && JSON.stringify(remote) !== JSON.stringify(stateRef.current)) {
        isPollingUpdate.current = true;
        dispatch({ type: 'LOAD', state: remote });
        saveState(remote);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [mounted]);

  const incrementTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period) =>
      dispatch({ type: 'INCREMENT_TRACKER', repId, metric, period }),
    []
  );

  const decrementTracker = useCallback(
    (repId: string, metric: TrackerMetric, period: Period) =>
      dispatch({ type: 'DECREMENT_TRACKER', repId, metric, period }),
    []
  );

  const incrementPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period) =>
      dispatch({ type: 'INCREMENT_POINTS', repId, metric, period }),
    []
  );

  const decrementPoints = useCallback(
    (repId: string, metric: PointsMetric, period: Period) =>
      dispatch({ type: 'DECREMENT_POINTS', repId, metric, period }),
    []
  );

  const addRep = useCallback(
    (name: string) => dispatch({ type: 'ADD_REP', name }),
    []
  );

  const toggleParticipant = useCallback(
    (repId: string) => dispatch({ type: 'TOGGLE_POINTS_PARTICIPANT', repId }),
    []
  );

  const resetDay = useCallback(() => dispatch({ type: 'RESET_DAY' }), []);

  return {
    state,
    mounted,
    incrementTracker,
    decrementTracker,
    incrementPoints,
    decrementPoints,
    addRep,
    toggleParticipant,
    resetDay,
  };
}
