import { config } from "dotenv";

config();

export const {
    PORT,
    DATABASE_URL,
    CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY,
    ML_SERVICE_URL,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET
} = process.env;