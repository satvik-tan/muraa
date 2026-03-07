import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

// Reuse the same instance across hot-reloads in dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;