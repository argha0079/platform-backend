import axios from "axios";
import FormData from "form-data";

import {
    ML_SERVICE_URL
} from "../config/envConfig.js";


const ML_TIMEOUT = 60000;


class MLService {

    constructor() {

        this.baseUrl = ML_SERVICE_URL;

    }


    async analyzeChallenge(
        text,
        imageBuffer = null,
        imageName = null,
        audioBuffer = null,
        audioName = null
    ) {

        const formData = new FormData();

        if (imageBuffer && imageName) {

            formData.append("image", imageBuffer, {
                filename: imageName
            });

        }

        if (audioBuffer && audioName) {

            formData.append("audio", audioBuffer, {
                filename: audioName
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