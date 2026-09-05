import { v2 as cloudinary } from "cloudinary";

import {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET
} from "../config/envConfig.js";


cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});


class CloudinaryService {

    constructor() {

        this.imageFolder = "civic-sync/challenges/images";
        this.audioFolder = "civic-sync/challenges/audio";

    }


    uploadFromBuffer(buffer, options) {

        return new Promise((resolve, reject) => {

            const uploadStream = cloudinary.uploader.upload_stream(
                options,
                (error, result) => {

                    if (error) {

                        reject(error);

                    } else {

                        resolve(result);

                    }

                }
            );

            uploadStream.end(buffer);

        });

    }


    async uploadImage(buffer, originalName) {

        const result = await this.uploadFromBuffer(buffer, {
            folder: this.imageFolder,
            resource_type: "image",
            original_filename: originalName
        });

        return {
            url: result.secure_url,
            publicId: result.public_id
        };

    }


    async uploadAudio(buffer, originalName) {

        const result = await this.uploadFromBuffer(buffer, {
            folder: this.audioFolder,
            resource_type: "video",
            original_filename: originalName
        });

        return {
            url: result.secure_url,
            publicId: result.public_id
        };

    }

}


export default CloudinaryService;