import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { CompetitionState, TrackerMetric, PointsMetric, Period } from '@/lib/types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

type ServerAction =
  | { type: 'INCREMENT_TRACKER'; repId: string; metric: TrackerMetric; period: Period }
  | { type: 'DECREMENT_TRACKER'; repId: string; metric: TrackerMetric; period: Period }
  | { type: 'SET_TRACKER'; repId: string; metric: TrackerMetric; period: Period; value: number }
  | { type: 'INCREMENT_POINTS'; repId: string; metric: PointsMetric; period: Period }
  | { type: 'DECREMENT_POINTS'; repId: string; metric: PointsMetric; period: Period }
  | { type: 'SET_POINTS'; repId: string; metric: PointsMetric; period: Period; value: number }
  | { type: 'ADD_REP'; name: string; id: string }
  | { type: 'TOGGLE_POINTS_PARTICIPANT'; repId: string }
  | { type: 'RESET_DAY' }
  | { type: 'INIT'; state: CompetitionState };

function applyAction(state: CompetitionState, action: ServerAction): CompetitionState {
  switch (action.type) {
    case 'INIT':
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
        trackerEntries: [...state.trackerEntries, {
          repId: newRep.id,
          dials: { morning: 0, afternoon: 0 },
          pickUps: { morning: 0, afternoon: 0 },
          sets: { morning: 0, afternoon: 0 },
        }],
        pointsEntries: [...state.pointsEntries, {
          repId: newRep.id,
          dials: { morning: 0, afternoon: 0 },
          dnc: { morning: 0, afternoon: 0 },
          notInterested: { morning: 0, afternoon: 0 },
          sets: { morning: 0, afternoon: 0 },
        }],
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
        trackerEntries: state.reps.map((r) => ({
          repId: r.id,
          dials: { morning: 0, afternoon: 0 },
          pickUps: { morning: 0, afternoon: 0 },
          sets: { morning: 0, afternoon: 0 },
        })),
        pointsEntries: state.reps.map((r) => ({
          repId: r.id,
          dials: { morning: 0, afternoon: 0 },
          dnc: { morning: 0, afternoon: 0 },
          notInterested: { morning: 0, afternoon: 0 },
          sets: { morning: 0, afternoon: 0 },
        })),
        date: new Date().toISOString().split('T')[0],
      };

    default:
      return state;
  }
}

function getKey(date: string) {
  return `dial-comp-${date}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const state = await redis.get<CompetitionState>(getKey(date));
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ state: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as ServerAction;
    const date = body.date as string;

    if (!action || !date) {
      return NextResponse.json({ error: 'Missing action or date' }, { status: 400 });
    }

    const key = getKey(date);

    // Read current state from Redis
    let state = await redis.get<CompetitionState>(key);

    // If no state exists and this is an INIT action, just save it
    if (!state) {
      if (action.type === 'INIT') {
        await redis.set(key, action.state);
        return NextResponse.json({ state: action.state });
      }
      return NextResponse.json({ error: 'No state to update' }, { status: 404 });
    }

    // Apply the action to the current server state
    state = applyAction(state, action);

    // Write back
    await redis.set(key, state);

    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ error: 'KV unavailable' }, { status: 500 });
  }
}
