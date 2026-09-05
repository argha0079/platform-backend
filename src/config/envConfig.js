import { config } from "dotenv";

config();

export const {
    PORT, 
    DATABASE_URL,
    CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY
} = process.env;