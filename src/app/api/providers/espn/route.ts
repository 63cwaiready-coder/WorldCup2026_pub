import { NextResponse } from 'next/server';
import { fetchEspnFifaWorldCupFixtures } from '@/lib/espn';

export async function GET() {
  try {
    const { fixtures } = await fetchEspnFifaWorldCupFixtures();
    return NextResponse.json({ fixtures, source: 'espn' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ESPN fixtures' },
      { status: 502 },
    );
  }
}
