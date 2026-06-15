import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ ok: true, service: 'world-cup-2026-betting-game' });
}
