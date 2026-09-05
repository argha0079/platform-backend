import { prisma } from '../config/dbConfig.js';

class ChallengeRepository {
    async create(challengeData) {
        const challenge = await prisma.challenge.create({
            data: challengeData,
        });

        return challenge;
    }

    async findById(challengeId) {
        const challenge = await prisma.challenge.findUnique({
            where: {
                id: challengeId,
            },
            include: {
                media: true,
                assignments: {
                    include: {
                        organization: true,
                    },
                },
                project: true,
            },
        });

        return challenge;
    }

    async update(challengeId, challengeData) {
        const challenge = await prisma.challenge.update({
            where: {
                id: challengeId,
            },
            data: challengeData,
        });

        return challenge;
    }

    async createMedia(mediaData) {
        const media = await prisma.challengeMedia.create({
            data: mediaData,
        });

        return media;
    }

    async findByUserId(userId) {
        const challenges = await prisma.challenge.findMany({
            where: {
                userId,
            },
            include: {
                media: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return challenges;
    }

    async findSimilarityTexts(excludeChallengeId) {
        const challenges = await prisma.challenge.findMany({
            where: {
                id: {
                    not: excludeChallengeId,
                },
                status: {
                    not: 'FAILED',
                },
                unifiedText: {
                    not: null,
                },
            },
            select: {
                id: true,
                title: true,
                unifiedText: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 100,
        });

        const candidates = challenges.map((challenge) => ({
            id: challenge.id,
            title: challenge.title,
            unifiedText: challenge.unifiedText,
        }));

        return candidates.filter((candidate) => !!candidate.unifiedText);
    }

    async findOpenChallenges() {
        const challenges = await prisma.challenge.findMany({
            where: {
                status: {
                    in: ['SUBMITTED', 'ASSIGNED', 'NEEDS_REASSIGNMENT'],
                },
            },
            include: {
                media: true,
                assignments: {
                    include: {
                        organization: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return challenges;
    }

    async findRawById(challengeId) {
        const challenge = await prisma.challenge.findUnique({
            where: {
                id: challengeId,
            },
        });

        return challenge;
    }
}

export default ChallengeRepository;
