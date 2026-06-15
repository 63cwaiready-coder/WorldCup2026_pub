import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const fixtures = await prisma.fixture.findMany({ orderBy: { kickoffAt: 'asc' } });
console.log(JSON.stringify(fixtures, null, 2));
await prisma.$disconnect();
