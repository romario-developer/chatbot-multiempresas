import { PrismaClient } from '@prisma/client';

// Prisma singleton para ser reutilizado nos módulos
export const prisma = new PrismaClient();
