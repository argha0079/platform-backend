import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import logger from './utils/logger.js';
import morganMiddleware from './middlewares/morgan.middleware.js';
import { PORT } from './config/envConfig.js';
import { connectDatabase } from './config/dbConfig.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const setupAndStartServer = async () => {
    // create the express object
    const app = express();

    // middlewares
    app.use(cors());
    app.use(clerkMiddleware());
    app.use(express.json());
    app.use(morganMiddleware);

    // health check route
    app.get('/health', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Server is running',
        });
    });

    // api routes
    app.use('/api', apiRouter);

    // global error handler
    app.use(errorHandler);

    await connectDatabase();

    // start server
    const server = app.listen(PORT, () => {
        logger.info(`Server started at port ${PORT}`);
    });

    server.on('error', (error) => {
        console.error('Server failed to start:', error.message);
        process.exit(1);
    });
};

setupAndStartServer().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
});
