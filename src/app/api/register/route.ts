import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signAuthToken } from '@/lib/auth';

const schema = z.object({
  username: z.string().min(3).max(32),
  displayName: z.string().min(1).max(64),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash,
      currentTokens: 1000,
      startingTokens: 1000,
    },
  });

  await prisma.tokenLedger.create({
    data: {
      userId: user.id,
      entryType: 'INITIAL_BONUS',
      amount: 1000,
      balanceAfter: 1000,
      note: 'Initial token allocation',
    },
  });

  const token = await signAuthToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
  return NextResponse.json({
    user: { id: user.id, username: user.username, displayName: user.displayName, currentTokens: user.currentTokens },
    token,
  }, { status: 201 });
}
