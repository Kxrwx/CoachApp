import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
const baseDbUrl = process.env.DATABASE_URL || "";

const finalUrl = baseDbUrl.includes("?") 
  ? `${baseDbUrl}&pgbouncer=true&connect_timeout=30` 
  : `${baseDbUrl}?pgbouncer=true&connect_timeout=30`;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        url: finalUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;