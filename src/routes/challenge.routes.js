import { Router } from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { syncUser } from "../middlewares/user.middleware.js";
import upload from "../middlewares/upload.middleware.js";

import {
    submitChallenge,
    getMyChallenges,
    getChallengeById
} from "../controllers/challenge.controller.js";


const challengeRouter = Router();


// POST /api/challenges
challengeRouter.post(
    "/",
    authenticateUser,
    syncUser,
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "audio", maxCount: 1 }
    ]),
    submitChallenge
);


// GET /api/challenges/mine
challengeRouter.get(
    "/mine",
    authenticateUser,
    syncUser,
    getMyChallenges
);


// GET /api/challenges/:id
challengeRouter.get(
    "/:id",
    authenticateUser,
    syncUser,
    getChallengeById
);


export default challengeRouter;