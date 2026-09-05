import morgan from 'morgan';
import logger from '../utils/logger.js';

// Pipe Morgan's output into Winston instead of stdout directly
const stream = { write: (message) => logger.http(message.trim()) };

// In production: 'combined' = full Apache log format (IP, user-agent, status, response time)
// In dev: 'dev' = compact colored output
const morganMiddleware = morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream,
});

export default morganMiddleware;
