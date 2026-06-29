//
// prisma.ts
//
// A single PrismaClient for the whole process. Importing this anywhere gives
// the same pooled instance.
//

import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

export const prisma = new PrismaClient({
  log: env.LOG_LEVEL === "debug" ? ["query", "warn", "error"] : ["warn", "error"],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
