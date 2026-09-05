import multer from 'multer';

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/webm',
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error(
            'Invalid file type. Allowed: JPG/PNG/WEBP image, MP3/WAV/M4A/WEBM audio'
        );
        error.statusCode = 400;
        cb(error);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter,
});

export default upload;
