import axios from "axios";
import FormData from "form-data";

import {
    ML_SERVICE_URL
} from "../config/envConfig.js";


const ML_TIMEOUT = 60000;

const ML_MAX_CHALLENGE_LENGTH = 5000;

// Content-Types accepted by the ML service (main.py validate_content_type).
// Map both common browser mimetypes and x-* variants to the whitelist value.
const CONTENT_TYPE_MAP = {
    "image/jpeg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "audio/mpeg": "audio/mpeg",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/mp4": "audio/mp4",
    "audio/m4a": "audio/mp4",
    "audio/x-m4a": "audio/mp4",
    "audio/webm": "audio/webm",
    "video/mp4": "audio/mp4"
};

const EXTENSION_CONTENT_TYPES = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    mp4: "audio/mp4",
    webm: "audio/webm"
};


const resolveContentType = (file) => {

    if (file?.mimetype && CONTENT_TYPE_MAP[file.mimetype]) {

        return CONTENT_TYPE_MAP[file.mimetype];

    }

    const extension = (file?.originalname || "")
        .split(".")
        .pop()
        ?.toLowerCase();

    return EXTENSION_CONTENT_TYPES[extension] || undefined;

};


class MLService {

    constructor() {

        this.baseUrl = ML_SERVICE_URL;

    }

    // imageFile / audioFile are multer file objects (buffer, originalname,
    // mimetype) or null.
    async analyzeChallenge(text, imageFile = null, audioFile = null) {

        const formData = new FormData();

        if (imageFile?.buffer) {

            formData.append("image", imageFile.buffer, {
                filename: imageFile.originalname,
                contentType: resolveContentType(imageFile)
            });

        }

        if (audioFile?.buffer) {

            formData.append("audio", audioFile.buffer, {
                filename: audioFile.originalname,
                contentType: resolveContentType(audioFile)
            });

        }

        // NOTE: /analyze expects `challenge` as a QUERY param (verified
        // from the ML service's main.py), not a form field.
        const url = `${this.baseUrl}/analyze?challenge=${encodeURIComponent(text)}`;

        const response = await axios.post(
            url,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: ML_TIMEOUT
            }
        );

        return response.data;

    }


    async detectSimilarity(text, existingTexts) {

        const formData = new FormData();

        formData.append("challenge", text || "");

        formData.append(
            "existing_challenges",
            existingTexts.join(", ")
        );

        const response = await axios.post(
            `${this.baseUrl}/similarity`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: ML_TIMEOUT
            }
        );

        return response.data;

    }

}


export default MLService;
export {
    ML_MAX_CHALLENGE_LENGTH
};