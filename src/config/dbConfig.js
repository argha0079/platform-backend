import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_URL } from './envConfig.js';

const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

const connectDatabase = async () => {
    try {
        await prisma.$connect();
        console.log('[Database]: connected successfully');
    } catch (error) {
        console.error('[Database]: connection failed', error);
        process.exit(1);
    }
};

export { prisma, connectDatabase };
