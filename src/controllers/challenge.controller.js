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

        // owner, admin or the assigned organization may view a challenge
        const isOwner = challenge.userId === req.user.id;
        const isAdmin = req.user.role === "ADMIN";

        const isAssignedOrg = challenge.assignments
            ?.some(
                (assignment) => (
                    assignment.status === "ACCEPTED"
                    || assignment.status === "PENDING"
                )
                && assignment.organization?.userId === req.user.id
            );

        if (!isOwner && !isAdmin && !isAssignedOrg) {

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


export const listOpenChallenges = async (req, res, next) => {

    try {

        const challenges = await challengeService.getOpenChallenges();

        res.status(200).json({
            success: true,
            message: "Open challenges fetched successfully",
            data: challenges
        });

    } catch (error) {

        next(error);

    }

};


export const assignChallenge = async (req, res, next) => {

    try {

        const challengeId = req.params.id;
        const { organizationId, remarks } = req.body;

        if (!organizationId) {

            const error = new Error("organizationId is required");
            error.statusCode = 400;
            throw error;

        }

        const assignment = await challengeService.adminAssignChallenge(
            challengeId,
            organizationId,
            remarks
        );

        res.status(201).json({
            success: true,
            message: "Challenge assigned successfully",
            data: assignment
        });

    } catch (error) {

        next(error);

    }

};