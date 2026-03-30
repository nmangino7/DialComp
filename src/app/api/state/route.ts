import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { CompetitionState } from '@/lib/types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const state = await redis.get<CompetitionState>(`dial-comp-${date}`);
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ state: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = body.state as CompetitionState;

    if (!state || !state.reps || !state.date) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    }

    await redis.set(`dial-comp-${state.date}`, state);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'KV unavailable' }, { status: 500 });
  }
}
