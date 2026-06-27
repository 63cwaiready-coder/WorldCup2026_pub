import 'server-only';
import { createRequire }S from 'node:module';
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
    }
  } catch {
    // Keep the original string if it is not a valid URL parse target.
  }

  return rawUrl;
}

const databaseUrl = resolveDatabaseUrl();

function createPrismaClient() {
  return new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : undefined,
  ) as DbLike;
}

function buildWhereClause(where: Record<string, unknown> | undefined) {
  const entries = Object.entries(where ?? {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return { clause: '', values: [] as unknown[] };
  const clause = entries
    .map(([key], index) => `"${key}" = $${index + 1}`)
    .join(' AND ');
  return { clause: `WHERE ${clause}`, values: entries.map(([, value]) => value) };
}

async function queryOne<T>(db: DbLike, sql: TemplateStringsArray | string, ...values: unknown[]) {
  const rows = await db.$queryRaw<T[]>(sql as TemplateStringsArray, ...values);
  return rows[0] ?? null;
}

function createCompatClient(base: DbLike): DbLike {
  const user = {
    async findMany(args: any = {}) {
      const take = typeof args?.take === 'number' ? Math.max(1, Math.min(args.take, 1000)) : null;
      const rows = await base.$queryRaw<any[]>`
        SELECT *
        FROM "User"
        ORDER BY "currentTokens" DESC, id ASC
        ${take ? `LIMIT ${take}` : ''}
      `;
      return rows;
    },
    async findUnique(args: any) {
      const where = args?.where ?? {};
      if (where.id != null) return queryOne(base, `SELECT * FROM "User" WHERE id = $1 LIMIT 1`, where.id);
      if (where.username != null) return queryOne(base, `SELECT * FROM "User" WHERE username = $1 LIMIT 1`, where.username);
      return null;
    },
    async create(args: any) {
      const d = args?.data ?? {};
      return queryOne(
        base,
        `
          INSERT INTO "User" (username, "displayName", "passwordHash", "startingTokens", "currentTokens", "isAdmin")
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        d.username,
        d.displayName ?? null,
        d.passwordHash,
        d.startingTokens ?? 1000,
        d.currentTokens ?? 1000,
        d.isAdmin ?? false,
      );
    },
    async update(args: any) {
      const d = args?.data ?? {};
      const where = args?.where ?? {};
      if (where.id == null) throw new Error('Unsupported where for User.update');
      const keys = Object.keys(d).filter((key) => d[key] !== undefined);
      if (keys.length === 0) return this.findUnique({ where });
      const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');
      return queryOne(base, `UPDATE "User" SET ${setClause}, "updatedAt" = NOW() WHERE id = $1 RETURNING *`, where.id, ...keys.map((key) => d[key]));
    },
  };

  const fixture = {
    async findMany(args: any = {}) {
      const rows = await base.$queryRaw<any[]>`
        SELECT *
        FROM "Fixture"
        ORDER BY "kickoffAt" ASC, id ASC
      `;
      return rows;
    },
    async findUnique(args: any) {
      const where = args?.where ?? {};
      if (where.id != null) return queryOne(base, `SELECT * FROM "Fixture" WHERE id = $1 LIMIT 1`, where.id);
      if (where.externalFixtureId != null) return queryOne(base, `SELECT * FROM "Fixture" WHERE "externalFixtureId" = $1 LIMIT 1`, where.externalFixtureId);
      return null;
    },
    async findFirst(args: any = {}) {
      const where = args?.where ?? {};
      const { clause, values } = buildWhereClause(where);
      return queryOne(base, `SELECT * FROM "Fixture" ${clause} ORDER BY "kickoffAt" ASC, id ASC LIMIT 1`, ...values);
    },
    async update(args: any) {
      const d = args?.data ?? {};
      const where = args?.where ?? {};
      if (where.id == null) throw new Error('Unsupported where for Fixture.update');
      const keys = Object.keys(d).filter((key) => d[key] !== undefined);
      if (keys.length === 0) return this.findUnique({ where });
      const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');
      return queryOne(base, `UPDATE "Fixture" SET ${setClause}, "updatedAt" = NOW() WHERE id = $1 RETURNING *`, where.id, ...keys.map((key) => d[key]));
    },
    async upsert(args: any) {
      const create = args?.create ?? {};
      const update = args?.update ?? {};
      const externalFixtureId = args?.where?.externalFixtureId;
      if (!externalFixtureId) throw new Error('Unsupported where for Fixture.upsert');
      const merged = { ...create, ...update };
      return queryOne(
        base,
        `
          INSERT INTO "Fixture" (
            "externalFixtureId", competition, stage, "homeTeam", "awayTeam", "kickoffAt", status,
            "homeScore", "awayScore", winner, "sourceProvider", "sourceUpdatedAt", "lastSyncedAt"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          ON CONFLICT ("externalFixtureId") DO UPDATE SET
            competition = EXCLUDED.competition,
            stage = EXCLUDED.stage,
            "homeTeam" = EXCLUDED."homeTeam",
            "awayTeam" = EXCLUDED."awayTeam",
            "kickoffAt" = EXCLUDED."kickoffAt",
            status = EXCLUDED.status,
            "homeScore" = EXCLUDED."homeScore",
            "awayScore" = EXCLUDED."awayScore",
            winner = EXCLUDED.winner,
            "sourceProvider" = EXCLUDED."sourceProvider",
            "sourceUpdatedAt" = EXCLUDED."sourceUpdatedAt",
            "lastSyncedAt" = EXCLUDED."lastSyncedAt",
            "updatedAt" = NOW()
          RETURNING *
        `,
        externalFixtureId,
        merged.competition ?? 'World Cup 2026',
        merged.stage ?? null,
        merged.homeTeam,
        merged.awayTeam,
        merged.kickoffAt,
        merged.status ?? 'UPCOMING',
        merged.homeScore ?? null,
        merged.awayScore ?? null,
        merged.winner ?? null,
        merged.sourceProvider ?? null,
        merged.sourceUpdatedAt ?? null,
        merged.lastSyncedAt ?? null,
      );
    },
  };

  const bid = {
    async findMany(args: any = {}) {
      const where = args?.where ?? {};
      const filters: string[] = [];
      const values: unknown[] = [];
      if (where.fixtureId != null) {
        values.push(where.fixtureId);
        filters.push(`"fixtureId" = $${values.length}`);
      }
      if (where.userId != null) {
        values.push(where.userId);
        filters.push(`"userId" = $${values.length}`);
      }
      const clause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      return base.$queryRaw<any[]>`
        SELECT * FROM "Bid"
        ${clause}
        ORDER BY "placedAt" ASC, id ASC
      `;
    },
    async create(args: any) {
      const d = args?.data ?? {};
      return queryOne(
        base,
        `
          INSERT INTO "Bid" (
            "userId", "fixtureId", "bidType", "predictedResult", "predictedHomeScore", "predictedAwayScore", "costTokens"
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *
        `,
        d.userId,
        d.fixtureId,
        d.bidType,
        d.predictedResult ?? null,
        d.predictedHomeScore ?? null,
        d.predictedAwayScore ?? null,
        d.costTokens ?? 10,
      );
    },
    async update(args: any) {
      const d = args?.data ?? {};
      const where = args?.where ?? {};
      if (where.id == null) throw new Error('Unsupported where for Bid.update');
      const keys = Object.keys(d).filter((key) => d[key] !== undefined);
      if (keys.length === 0) return queryOne(base, `SELECT * FROM "Bid" WHERE id = $1 LIMIT 1`, where.id);
      const setClause = keys.map((key, index) => `"${key}" = $${index + 2}`).join(', ');
      return queryOne(base, `UPDATE "Bid" SET ${setClause}, "updatedAt" = NOW() WHERE id = $1 RETURNING *`, where.id, ...keys.map((key) => d[key]));
    },
  };

  const tokenLedger = {
    async create(args: any) {
      const d = args?.data ?? {};
      return queryOne(
        base,
        `
          INSERT INTO "TokenLedger" ("userId", "fixtureId", "bidId", "entryType", amount, "balanceAfter", note)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *
        `,
        d.userId,
        d.fixtureId ?? null,
        d.bidId ?? null,
        d.entryType,
        d.amount,
        d.balanceAfter,
        d.note ?? null,
      );
    },
  };

  const fixtureSyncLog = {
    async create(args: any) {
      const d = args?.data ?? {};
      return queryOne(
        base,
        `
          INSERT INTO "FixtureSyncLog" ("providerName", success, message, "rawPayload")
          VALUES ($1,$2,$3,$4)
          RETURNING *
        `,
        d.providerName,
        d.success,
        d.message ?? null,
        d.rawPayload ?? null,
      );
    },
    async findFirst(args: any = {}) {
      const orderBy = args?.orderBy ?? {};
      const [column] = Object.keys(orderBy);
      const direction = column ? String(orderBy[column]).toUpperCase() === 'ASC' ? 'ASC' : 'DESC' : 'DESC';
      return queryOne(base, `SELECT * FROM "FixtureSyncLog" ORDER BY "syncedAt" ${direction}, id ${direction} LIMIT 1`);
    },
  };

  const compatTx = {
    ...base,
    user,
    fixture,
    bid,
    tokenLedger,
    fixtureSyncLog,
  } as DbLike;

  return new Proxy(base as DbLike, {
    get(target, prop, receiver) {
      if (prop === 'user') return user;
      if (prop === 'fixture') return fixture;
      if (prop === 'bid') return bid;
      if (prop === 'tokenLedger') return tokenLedger;
      if (prop === 'fixtureSyncLog') return fixtureSyncLog;
      if (prop === '$transaction') {
        return async (arg: any) => {
          if (Array.isArray(arg)) return target.$transaction(arg);
          return target.$transaction(async (tx: any) => arg({ ...tx, user, fixture, bid, tokenLedger, fixtureSyncLog } as DbLike));
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as DbLike;
}

export const prisma = globalThis.prisma ?? createCompatClient(createPrismaClient());

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
