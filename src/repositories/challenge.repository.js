import { prisma } from "../config/dbConfig.js";


class ChallengeRepository {

    async create(challengeData) {

        const challenge = await prisma.challenge.create({
            data: challengeData
        });

        return challenge;

    }


    async findById(challengeId) {

        const challenge = await prisma.challenge.findUnique({
            where: {
                id: challengeId
            },
            include: {
                media: true,
                assignments: true,
                project: true
            }
        });

        return challenge;

    }


    async update(challengeId, challengeData) {

        const challenge = await prisma.challenge.update({
            where: {
                id: challengeId
            },
            data: challengeData
        });

        return challenge;

    }


    async createMedia(mediaData) {

        const media = await prisma.challengeMedia.create({
            data: mediaData
        });

        return media;

    }


    async findByUserId(userId) {

        const challenges = await prisma.challenge.findMany({
            where: {
                userId
            },
            include: {
                media: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return challenges;

    }


    async findSimilarityTexts(excludeChallengeId) {

        const challenges = await prisma.challenge.findMany({
            where: {
                id: {
                    not: excludeChallengeId
                },
                status: {
                    not: "FAILED"
                },
                unifiedText: {
                    not: null
                }
            },
            select: {
                unifiedText: true
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 100
        });

        return challenges
            .map((challenge) => challenge.unifiedText)
            .filter(Boolean);

    }

}


export default ChallengeRepository;