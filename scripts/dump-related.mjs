import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const fixture = await prisma.fixture.findUnique({ where: { externalFixtureId: 'wc26-demo-1' }, include: { bids: true, tokenLedger: true } });
const users = await prisma.user.findMany({ orderBy: { username: 'asc' } });
console.log(JSON.stringify({ fixture, users }, null, 2));
await prisma.$disconnect();
