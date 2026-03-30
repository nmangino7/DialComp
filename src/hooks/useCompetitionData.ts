'use client';

import { useReducer, useEffect, useState, useCallback } from 'react';
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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    const today = new Date().toISOString().split('T')[0];
    if (saved && saved.date === today) {
      dispatch({ type: 'LOAD', state: saved });
    }
    setMounted(true);
  }, []);

  // Persist on every change after mount
  useEffect(() => {
    if (mounted) {
      saveState(state);
    }
  }, [state, mounted]);

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
