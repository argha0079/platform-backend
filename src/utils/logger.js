import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log levels — Winston's default doesn't have 'http'
const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'blue' };
winston.addColors(colors);

const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack }) =>
        stack
            ? `[${timestamp}] ${level}: ${message}\n${stack}`
            : `[${timestamp}] ${level}: ${message}`
    )
);

const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    winston.format.json() // structured JSON — readable by Render's log dashboard
);

const logger = winston.createLogger({
    levels,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [
        new winston.transports.Console(),
        ...(process.env.NODE_ENV === 'production'
            ? [
                  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                  new winston.transports.File({ filename: 'logs/combined.log' }),
              ]
            : []),
    ],
    exceptionHandlers: [new winston.transports.Console()],
    rejectionHandlers: [new winston.transports.Console()],
});

export default logger;
