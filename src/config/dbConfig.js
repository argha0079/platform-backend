import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_URL } from './envConfig.js';
import logger from '../utils/logger.js';

const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const connectDatabase = async () => {
    try {
        await prisma.$connect();
        logger.info('[Database]: connected successfully');
    } catch (error) {
        logger.error('[Database]: connection failed', error);
        process.exit(1);
    }
};

export { prisma, connectDatabase };
