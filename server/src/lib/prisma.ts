import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger.js';

const logger = createLogger('prisma');

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances in development due to hot reloading
const prisma =
  global.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug({
      msg: 'Prisma Query',
      query: e.query,
      duration: `${e.duration}ms`,
    });
  });
}

// Connection handling
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info({ msg: 'Database connected successfully' });
  } catch (error) {
    logger.error({ msg: 'Database connection failed', error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info({ msg: 'Database disconnected' });
}

export { prisma };
export default prisma;
