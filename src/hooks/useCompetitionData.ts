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
import { emit } from '@/lib/eventBus';
import { calculatePoints } from '@/lib/points';
import { checkStatsAchievements } from '@/lib/achievements';

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

  // Track previous state for change detection (event emissions)
  const prevStateRef = useRef<CompetitionState | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev) return;

    // Check each rep for changes
    state.pointsEntries.forEach((newEntry) => {
      const prevEntry = prev.pointsEntries.find((e) => e.repId === newEntry.repId);
      if (!prevEntry) return;
      const rep = state.reps.find((r) => r.id === newEntry.repId);
      if (!rep) return;

      // Set scored?
      const newSets = newEntry.sets.morning + newEntry.sets.afternoon;
      const oldSets = prevEntry.sets.morning + prevEntry.sets.afternoon;
      if (newSets > oldSets) {
        emit({
          type: 'set_scored',
          message: `${rep.name} scored a set! (+10 pts)`,
          repId: rep.id,
          repName: rep.name,
        });
      }

      // Milestones (every 25 points)
      const newPoints = calculatePoints(newEntry);
      const oldPoints = calculatePoints(prevEntry);
      const milestones = [25, 50, 75, 100, 150, 200];
      milestones.forEach((m) => {
        if (oldPoints < m && newPoints >= m) {
          emit({
            type: 'milestone',
            message: `${rep.name} hit ${m} points!`,
            repId: rep.id,
            repName: rep.name,
          });
        }
      });
    });

    // Lead change
    const sortPoints = (entries: PointsEntry[]) => [...entries].sort((a, b) => calculatePoints(b) - calculatePoints(a));
    const prevTop = sortPoints(prev.pointsEntries.filter((e) => prev.pointsParticipantIds.includes(e.repId)))[0];
    const newTop = sortPoints(state.pointsEntries.filter((e) => state.pointsParticipantIds.includes(e.repId)))[0];
    if (newTop && (!prevTop || prevTop.repId !== newTop.repId) && calculatePoints(newTop) > 0) {
      const rep = state.reps.find((r) => r.id === newTop.repId);
      if (rep) {
        emit({
          type: 'took_lead',
          message: `${rep.name} took the lead!`,
          repId: rep.id,
          repName: rep.name,
        });
      }
    }

    // Check my own achievements
    if (myRepId) {
      const myEntry = state.pointsEntries.find((e) => e.repId === myRepId);
      if (myEntry) {
        const totalSets = myEntry.sets.morning + myEntry.sets.afternoon;
        const totalDials = myEntry.dials.morning + myEntry.dials.afternoon;
        const totalPoints = calculatePoints(myEntry);
        const isLeader = newTop?.repId === myRepId && totalPoints > 0;
        checkStatsAchievements({ totalSets, totalDials, totalPoints, isLeader });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, mounted, myRepId]);

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
