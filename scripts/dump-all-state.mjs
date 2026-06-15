import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const fixtures = await prisma.fixture.findMany({ orderBy: { kickoffAt: 'asc' }, include: { bids: true } });
const users = await prisma.user.findMany({ orderBy: { username: 'asc' } });
console.log(JSON.stringify({ fixtures, users }, null, 2));
await prisma.$disconnect();
