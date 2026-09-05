import multer from "multer";


const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/mpeg"
];


const fileFilter = (req, file, cb) => {

    if (ALLOWED_TYPES.includes(file.mimetype)) {

        cb(null, true);

    } else {

        const error = new Error(
            "Invalid file type. Allowed: JPG image, M4A/MP3 audio"
        );
        error.statusCode = 400;
        cb(error);

    }

};


const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter
});


export default upload;