import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { CompetitionState } from '@/lib/types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Lua script: atomically read state, apply action, write back
// This prevents the race condition where two concurrent requests
// both read the same state and one overwrites the other's changes.
const LUA_APPLY_ACTION = `
local key = KEYS[1]
local action_json = ARGV[1]
local action = cjson.decode(action_json)

local raw = redis.call('GET', key)
if not raw then
  return nil
end

local state = cjson.decode(raw)
local atype = action.type

if atype == 'INCREMENT_TRACKER' or atype == 'DECREMENT_TRACKER' or atype == 'SET_TRACKER' then
  local tab = 'trackerEntries'
  for i, entry in ipairs(state[tab]) do
    if entry.repId == action.repId then
      local metric = entry[action.metric]
      if metric then
        if atype == 'INCREMENT_TRACKER' then
          metric[action.period] = metric[action.period] + 1
        elseif atype == 'DECREMENT_TRACKER' then
          metric[action.period] = math.max(0, metric[action.period] - 1)
        else
          metric[action.period] = math.max(0, action.value)
        end
        entry[action.metric] = metric
        state[tab][i] = entry
      end
      break
    end
  end

elseif atype == 'INCREMENT_POINTS' or atype == 'DECREMENT_POINTS' or atype == 'SET_POINTS' then
  local tab = 'pointsEntries'
  for i, entry in ipairs(state[tab]) do
    if entry.repId == action.repId then
      local metric = entry[action.metric]
      if metric then
        if atype == 'INCREMENT_POINTS' then
          metric[action.period] = metric[action.period] + 1
        elseif atype == 'DECREMENT_POINTS' then
          metric[action.period] = math.max(0, metric[action.period] - 1)
        else
          metric[action.period] = math.max(0, action.value)
        end
        entry[action.metric] = metric
        state[tab][i] = entry
      end
      break
    end
  end

elseif atype == 'ADD_REP' then
  local newRep = { id = action.id, name = action.name }
  table.insert(state.reps, newRep)
  table.insert(state.trackerEntries, {
    repId = action.id,
    dials = { morning = 0, afternoon = 0 },
    pickUps = { morning = 0, afternoon = 0 },
    sets = { morning = 0, afternoon = 0 }
  })
  table.insert(state.pointsEntries, {
    repId = action.id,
    dials = { morning = 0, afternoon = 0 },
    dnc = { morning = 0, afternoon = 0 },
    notInterested = { morning = 0, afternoon = 0 },
    sets = { morning = 0, afternoon = 0 }
  })
  table.insert(state.pointsParticipantIds, action.id)

elseif atype == 'TOGGLE_POINTS_PARTICIPANT' then
  local found = false
  for i, id in ipairs(state.pointsParticipantIds) do
    if id == action.repId then
      table.remove(state.pointsParticipantIds, i)
      found = true
      break
    end
  end
  if not found then
    table.insert(state.pointsParticipantIds, action.repId)
  end

elseif atype == 'RESET_DAY' then
  local zero_ts = function()
    return { morning = 0, afternoon = 0 }
  end
  for i, rep in ipairs(state.reps) do
    state.trackerEntries[i] = {
      repId = rep.id,
      dials = zero_ts(), pickUps = zero_ts(), sets = zero_ts()
    }
    state.pointsEntries[i] = {
      repId = rep.id,
      dials = zero_ts(), dnc = zero_ts(), notInterested = zero_ts(), sets = zero_ts()
    }
  end
end

local result = cjson.encode(state)
redis.call('SET', key, result)
return result
`;

function getKey(date: string) {
  return `dial-comp-${date}`;
}

function emptyState(date: string): CompetitionState {
  return {
    reps: [],
    trackerEntries: [],
    pointsEntries: [],
    pointsParticipantIds: [],
    date,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const state = await redis.get<CompetitionState>(getKey(date));
    return NextResponse.json({ state: state || emptyState(date) });
  } catch {
    return NextResponse.json({ state: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;
    const date = body.date as string;

    if (!action || !date) {
      return NextResponse.json({ error: 'Missing action or date' }, { status: 400 });
    }

    const key = getKey(date);

    // INIT: use setnx to prevent race condition
    if (action.type === 'INIT') {
      const initState = action.state || emptyState(date);
      // SETNX: only sets if key doesn't exist — first writer wins
      const wasSet = await redis.setnx(key, JSON.stringify(initState));
      if (wasSet) {
        return NextResponse.json({ state: initState });
      }
      // Key already existed, return current state
      const existing = await redis.get<CompetitionState>(key);
      return NextResponse.json({ state: existing });
    }

    // For all other actions, use Lua script for atomic read-modify-write
    const resultRaw = await redis.eval(
      LUA_APPLY_ACTION,
      [key],
      [JSON.stringify(action)],
    );

    if (!resultRaw) {
      // No state exists yet — create empty state and retry
      const init = emptyState(date);
      await redis.setnx(key, JSON.stringify(init));
      const retryResult = await redis.eval(
        LUA_APPLY_ACTION,
        [key],
        [JSON.stringify(action)],
      );
      if (retryResult) {
        const state = typeof retryResult === 'string' ? JSON.parse(retryResult) : retryResult;
        return NextResponse.json({ state });
      }
      return NextResponse.json({ state: init });
    }

    const state = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
    return NextResponse.json({ state });
  } catch (err) {
    console.error('POST /api/state error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
