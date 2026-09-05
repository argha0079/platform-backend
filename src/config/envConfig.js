import { config } from "dotenv";


config();


const REQUIRED_ENV_VARS = [
    "PORT",
    "DATABASE_URL",
    "CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "ML_SERVICE_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
];


const missingEnvVars = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key].includes("<")
);


if (missingEnvVars.length > 0) {

    console.error(
        `Missing or unset environment variables: ${missingEnvVars.join(", ")}`
    );

    process.exit(1);

}


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