import prismaModule from "../generated/prisma/index.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const { PrismaClient } = prismaModule;

const globalForPrisma = globalThis as unknown as {
  prisma?: InstanceType<typeof PrismaClient>;
};

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
