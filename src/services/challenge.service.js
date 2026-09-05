import ChallengeRepository from "../repositories/challenge.repository.js";
import MLService from "./ml.service.js";
import CloudinaryService from "./cloudinary.service.js";


const DOMAIN_VALUES = [
    "DISASTER_MANAGEMENT",
    "AGRICULTURE",
    "HEALTH",
    "EDUCATION",
    "WATER_SANITATION",
    "INFRASTRUCTURE",
    "ENVIRONMENT",
    "MINING",
    "TRIBAL_WELFARE",
    "EMPLOYMENT",
    "URBAN_DEVELOPMENT",
    "ENERGY",
    "OTHER"
];


const mapDomain = (category) => {

    if (!category) {
        return "OTHER";
    }

    const mapped = String(category).toUpperCase();

    return DOMAIN_VALUES.includes(mapped)
        ? mapped
        : "OTHER";

};


const mapPriority = (level) => {

    const mapped = {
        High: "HIGH",
        Medium: "MEDIUM",
        Low: "LOW"
    }[level];

    return mapped || "LOW";

};


class ChallengeService {

    constructor() {

        this.challengeRepository = new ChallengeRepository();
        this.mlService = new MLService();
        this.cloudinaryService = new CloudinaryService();

    }


    buildChallengeText(title, description) {

        const descriptionText = description
            ? `\n\nDescription:\n${description}`
            : "";

        return `Title: ${title}${descriptionText}`;

    }


    async uploadAndStoreMedia(challengeId, mediaType, file) {

        let uploadResult = null;

        if (mediaType === "IMAGE") {

            uploadResult = await this.cloudinaryService.uploadImage(
                file.buffer,
                file.originalname
            );

        } else {

            uploadResult = await this.cloudinaryService.uploadAudio(
                file.buffer,
                file.originalname
            );

        }

        const media = await this.challengeRepository.createMedia({
            challengeId,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            mediaType,
            originalName: file.originalname
        });

        return media;

    }


    async uploadAllMedia(challengeId, imageFile, audioFile) {

        if (imageFile) {

            await this.uploadAndStoreMedia(
                challengeId,
                "IMAGE",
                imageFile
            );

        }

        if (audioFile) {

            await this.uploadAndStoreMedia(
                challengeId,
                "AUDIO",
                audioFile
            );

        }

    }


    async callAnalyzeWithRetry(text, imageFile, audioFile) {

        try {

            return await this.mlService.analyzeChallenge(
                text,
                imageFile ? imageFile.buffer : null,
                imageFile ? imageFile.originalname : null,
                audioFile ? audioFile.buffer : null,
                audioFile ? audioFile.originalname : null
            );

        } catch (firstError) {

            // one retry after a short pause
            await new Promise((resolve) => setTimeout(resolve, 2000));

            return await this.mlService.analyzeChallenge(
                text,
                imageFile ? imageFile.buffer : null,
                imageFile ? imageFile.originalname : null,
                audioFile ? audioFile.buffer : null,
                audioFile ? audioFile.originalname : null
            );

        }

    }


    mapMlResult(mlResult) {

        const category = mlResult.category?.category;
        const priorityLevel = mlResult.priority?.priority_level;
        const priorityScore = mlResult.priority?.priority_score;
        const confidence = mlResult.category?.confidence;

        const updateData = {
            mlCategory: category || null,
            category: mapDomain(category),
            mlConfidence: typeof confidence === "number"
                ? confidence
                : null,
            priority: mapPriority(priorityLevel),
            priorityScore: typeof priorityScore === "number"
                ? priorityScore
                : null,
            extraction: mlResult.extraction || null,
            unifiedText: mlResult.unified_text || null,
            mlExplanation: mlResult.explanation?.summary || null
        };

        return updateData;

    }


    async runSimilarityCheck(text, challengeId) {

        const existingTexts = await this.challengeRepository.findSimilarityTexts(
            challengeId
        );

        if (existingTexts.length === 0) {

            return {
                isDuplicate: false,
                similarChallenges: [],
                similarityScore: null
            };

        }

        const similarity = await this.mlService.detectSimilarity(
            text,
            existingTexts
        );

        const isDuplicate = similarity.duplicate === true;
        const matchedChallenge = similarity.matched_challenge;

        return {
            isDuplicate,
            similarChallenges: matchedChallenge
                ? [matchedChallenge]
                : [],
            similarityScore: typeof similarity.similarity_score === "number"
                ? similarity.similarity_score
                : null
        };

    }


    async submitChallenge(userId, challengeData) {

        const {
            title,
            description,
            imageFile,
            audioFile
        } = challengeData;

        if (!title || !title.trim()) {

            const error = new Error("Title is required");
            error.statusCode = 400;
            throw error;

        }

        const hasContent = description && description.trim()
            || imageFile
            || audioFile;

        if (!hasContent) {

            const error = new Error(
                "Description, image or audio is required"
            );
            error.statusCode = 400;
            throw error;

        }

        const challengeText = this.buildChallengeText(
            title.trim(),
            description ? description.trim() : ""
        );

        // create challenge with status PROCESSING
        const challenge = await this.challengeRepository.create({
            userId,
            title: title.trim(),
            description: description ? description.trim() : "",
            status: "PROCESSING"
        });

        // ML analysis with one retry
        let mlResult = null;
        let mlFailed = false;

        try {

            mlResult = await this.callAnalyzeWithRetry(
                challengeText,
                imageFile,
                audioFile
            );

        } catch (error) {

            console.error("ML service failed:", error.message);
            mlFailed = true;

        }

        // upload media to Cloudinary and store metadata
        try {

            await this.uploadAllMedia(
                challenge.id,
                imageFile,
                audioFile
            );

        } catch (error) {

            console.error("Media upload failed:", error.message);

        }

        // ML could not be reached -> mark challenge as FAILED
        if (mlFailed) {

            await this.challengeRepository.update(
                challenge.id,
                {
                    status: "FAILED"
                }
            );

            const failedChallenge = await this.challengeRepository.findById(
                challenge.id
            );

            return {
                challenge: failedChallenge,
                warning: "ML service could not be reached. Challenge stored as FAILED."
            };

        }

        // interpret ML response
        const updateData = this.mapMlResult(mlResult);

        // duplicate / similarity check
        const similarityData = await this.runSimilarityCheck(
            mlResult.unified_text || challengeText,
            challenge.id
        );

        Object.assign(updateData, similarityData);

        updateData.status = updateData.isDuplicate
            ? "DUPLICATE"
            : "SUBMITTED";

        await this.challengeRepository.update(
            challenge.id,
            updateData
        );

        const finalChallenge = await this.challengeRepository.findById(
            challenge.id
        );

        return {
            challenge: finalChallenge,
            warning: null
        };

    }


    async getMyChallenges(userId) {

        const challenges = await this.challengeRepository.findByUserId(
            userId
        );

        return challenges;

    }


    async getChallengeById(challengeId) {

        const challenge = await this.challengeRepository.findById(
            challengeId
        );

        return challenge;

    }

}


export default ChallengeService;