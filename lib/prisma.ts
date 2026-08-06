import { PrismaClient } from '@prisma/client';

/**
 * The Prisma schema uses PostgreSQL. Keep the connection URL explicit so a
 * misconfigured deployment fails clearly instead of silently using ephemeral
 * serverless storage.
 */
function initDbUrl(): string {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (!envUrl) {
    throw new Error('DATABASE_URL must be configured with a PostgreSQL connection string.');
  }
  if (!envUrl.startsWith('postgresql://') && !envUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must use a PostgreSQL connection string.');
  }
  return envUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildDbUrl(): string {
  const base = initDbUrl();
  // For PostgreSQL on serverless/cloud environments, limit connections per function instance
  // to prevent "Too many clients" errors on Neon / PgBouncer connection pools.
  if (base.startsWith('postgresql://') || base.startsWith('postgres://')) {
    try {
      const url = new URL(base);
      // Keep the pool small for serverless instances, while allowing deployments
      // with a pooled database connection to support concurrent page requests.
      if (!url.searchParams.has('connection_limit')) {
        const configuredLimit = Number.parseInt(process.env.PRISMA_CONNECTION_LIMIT || '2', 10);
        const connectionLimit = Number.isFinite(configuredLimit)
          ? Math.max(1, Math.min(10, configuredLimit))
          : 2;
        url.searchParams.set('connection_limit', String(connectionLimit));
      }
      if (!url.searchParams.has('connect_timeout')) {
        url.searchParams.set('connect_timeout', '10');
      }
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }
      return url.toString();
    } catch {
      return base;
    }
  }
  return base;
}

const dbUrl = buildDbUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Always persist singleton on globalThis to prevent multiple instances
// across hot-reload (dev) AND across serverless warm containers (production).
globalForPrisma.prisma = prisma;

export default prisma;
