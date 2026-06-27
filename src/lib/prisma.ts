import 'server-only';
import { createRequire } from 'node:module';
import type { PrismaClient as PrismaClientType } from '@prisma/client';


type DbLike = PrismaClientType & {
  $queryRaw<T = unknown>(strings: TemplateStringsArray | string, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray | string, ...values: unknown[]): Promise<unknown>;
  $transaction<T>(fn: (tx: DbLike) => Promise<T>): Promise<T>;
  $transaction<T>(ops: Promise<T>[]): Promise<T[]>;
};


const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');


declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClientType | undefined;
}


function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.NEON_DATABASE_URL,
  ].filter(Boolean) as string[];


  const rawUrl = candidates[0];
  if (!rawUrl) return undefined;


  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes('neon.tech') && !url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
      return url.toString();
