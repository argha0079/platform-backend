import ChallengeService from "../services/challenge.service.js";


const challengeService = new ChallengeService();


export const submitChallenge = async (req, res, next) => {

    try {

        const userId = req.user.id;
        const { title, description } = req.body;

        const files = req.files || {};

        const imageFile = files.image?.[0];
        const audioFile = files.audio?.[0];

        const result = await challengeService.submitChallenge(
            userId,
            {
                title,
                description,
                imageFile,
                audioFile
            }
        );

        res.status(201).json({
            success: true,
            message: "Challenge submitted successfully",
            data: result.challenge,
            warning: result.warning
        });

    } catch (error) {

        next(error);

    }

};


export const getMyChallenges = async (req, res, next) => {

    try {

        const userId = req.user.id;

        const challenges = await challengeService.getMyChallenges(
            userId
        );

        res.status(200).json({
            success: true,
            message: "Challenges fetched successfully",
            data: challenges
        });

    } catch (error) {

        next(error);

    }

};


export const getChallengeById = async (req, res, next) => {

    try {

        const challengeId = req.params.id;

        const challenge = await challengeService.getChallengeById(
            challengeId
        );

        if (!challenge) {

            const error = new Error("Challenge not found");
            error.statusCode = 404;
            throw error;

        }

        res.status(200).json({
            success: true,
            message: "Challenge fetched successfully",
            data: challenge
        });

    } catch (error) {

        next(error);

    }

};