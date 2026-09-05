import ChallengeRepository from "../repositories/challenge.repository.js";
import MLService, { ML_MAX_CHALLENGE_LENGTH } from "./ml.service.js";
import CloudinaryService from "./cloudinary.service.js";
import OrganizationService from "./organization.service.js";


const ML_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ML_AUDIO_MAX_BYTES = 10 * 1024 * 1024;


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


// ML's /similarity joins the candidate list with commas, so any comma
// INSIDE a candidate text splits it into fragments (verified against the
// real service). Strip commas from everything we send there so both the
// query and the candidates stay single items and id-resolution still works.
const sanitizeForSimilarity = (text) => {

    return String(text || "").replace(/[,]/g, " ");

};


class ChallengeService {

    constructor() {

        this.challengeRepository = new ChallengeRepository();
        this.mlService = new MLService();
        this.cloudinaryService = new CloudinaryService();
        this.organizationService = new OrganizationService();

    }


    buildChallengeText(title, description) {

        const descriptionText = description
            ? `\n\nDescription:\n${description}`
            : "";

        const combined = `Title: ${title}${descriptionText}`;

        // ML service caps the challenge query param at 5000 chars
        return combined.slice(0, ML_MAX_CHALLENGE_LENGTH);

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
                imageFile,
                audioFile
            );

        } catch (firstError) {

            // one retry after a short pause
            await new Promise((resolve) => setTimeout(resolve, 2000));

            return await this.mlService.analyzeChallenge(
                text,
                imageFile,
                audioFile
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

        const candidates = await this.challengeRepository.findSimilarityTexts(
            challengeId
        );

        if (candidates.length === 0) {

            return {
                isDuplicate: false,
                similarChallenges: [],
                similarityScore: null
            };

        }

        // strip commas so ML's comma-separated list stays intact
        const candidateTexts = candidates.map(
            (candidate) => sanitizeForSimilarity(candidate.unifiedText)
        );

        const similarity = await this.mlService.detectSimilarity(
            sanitizeForSimilarity(text),
            candidateTexts
        );

        const isDuplicate = similarity.duplicate === true;
        const matchedChallenge = similarity.matched_challenge;

        let similarChallengeIds = [];

        if (matchedChallenge) {

            const matchedCandidate = candidates.find(
                (candidate) => (
                    sanitizeForSimilarity(candidate.unifiedText)
                        === matchedChallenge
                )
            );

            if (matchedCandidate) {

                similarChallengeIds = [matchedCandidate.id];

            }

        }

        return {
            isDuplicate,
            similarChallenges: similarChallengeIds,
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

        if (!title || typeof title !== "string" || !title.trim()) {

            const error = new Error("Title is required");
            error.statusCode = 400;
            throw error;

        }

        if (description && typeof description !== "string") {

            const error = new Error("Description must be a string");
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

        // enforce ML service file size caps (image <= 5MB, audio <= 10MB)
        if (imageFile && imageFile.size > ML_IMAGE_MAX_BYTES) {

            const error = new Error("Image exceeds the 5MB limit");
            error.statusCode = 400;
            throw error;

        }

        if (audioFile && audioFile.size > ML_AUDIO_MAX_BYTES) {

            const error = new Error("Audio exceeds the 10MB limit");
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

        // guard against empty / undefined ML response body
        if (!mlResult) {

            console.error("ML service returned an empty response");
            mlFailed = true;

        }

        // upload media to Cloudinary and store metadata
        let mediaFailed = false;

        try {

            await this.uploadAllMedia(
                challenge.id,
                imageFile,
                audioFile
            );

        } catch (error) {

            console.error("Media upload failed:", error.message);
            mediaFailed = true;

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

        // duplicate / similarity check (fallback to no-dedup on failure)
        let similarityFailed = false;

        try {

            const similarityData = await this.runSimilarityCheck(
                mlResult.unified_text || challengeText,
                challenge.id
            );

            Object.assign(updateData, similarityData);

        } catch (error) {

            console.error("Similarity check failed:", error.message);
            similarityFailed = true;

            Object.assign(updateData, {
                isDuplicate: false,
                similarChallenges: [],
                similarityScore: null
            });

        }

        updateData.status = updateData.isDuplicate
            ? "DUPLICATE"
            : "SUBMITTED";

        await this.challengeRepository.update(
            challenge.id,
            updateData
        );

        // auto-assign to matching organizations by category (non-fatal)
        let assignmentFailed = false;

        if (
            updateData.status === "SUBMITTED"
            && updateData.category
        ) {

            try {

                await this.organizationService.autoAssign(
                    challenge.id,
                    updateData.category
                );

            } catch (error) {

                console.error("Auto-assignment failed:", error.message);
                assignmentFailed = true;

            }

        }

        const finalChallenge = await this.challengeRepository.findById(
            challenge.id
        );

        const warnings = [];

        if (mediaFailed) {

            warnings.push(
                "Media upload failed. Challenge saved without media."
            );

        }

        if (similarityFailed) {

            warnings.push(
                "Similarity check failed. Challenge submitted without duplicate check."
            );

        }

        if (assignmentFailed) {

            warnings.push(
                "Auto-assignment to organizations failed."
            );

        }

        return {
            challenge: finalChallenge,
            warning: warnings.length > 0
                ? warnings.join(" ")
                : null
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


    async getOpenChallenges() {

        return this.challengeRepository.findOpenChallenges();

    }


    async adminAssignChallenge(challengeId, organizationId, remarks) {

        const challenge = await this.challengeRepository.findRawById(
            challengeId
        );

        if (!challenge) {

            const error = new Error("Challenge not found");
            error.statusCode = 404;
            throw error;

        }

        if (
            challenge.status !== "SUBMITTED"
            && challenge.status !== "ASSIGNED"
            && challenge.status !== "DUPLICATE"
        ) {

            const error = new Error(
                "Only submitted, assigned or duplicate challenges can be assigned"
            );
            error.statusCode = 400;
            throw error;

        }

        return this.organizationService.manuallyAssign(
            challengeId,
            organizationId,
            remarks
        );

    }

}


export default ChallengeService;