import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, _next) => {
    logger.error('Something went wrong', err);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Multer upload errors (file too large, unexpected field, etc.)
    if (err.code && err.code.startsWith('LIMIT_')) {
        statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        message = err.message || 'File upload error';
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};
