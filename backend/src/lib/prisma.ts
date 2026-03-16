import prismaModule from "../generated/prisma/index.js";

const { PrismaClient } = prismaModule;

export const prisma = new PrismaClient();