import { prisma } from '../config/dbConfig.js';

class OrganizationRepository {
    async findByUserId(userId) {
        const organization = await prisma.organization.findUnique({
            where: {
                userId,
            },
        });

        return organization;
    }

    async findById(organizationId) {
        const organization = await prisma.organization.findUnique({
            where: {
                id: organizationId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                    },
                },
            },
        });

        return organization;
    }

    async create(organizationData) {
        const organization = await prisma.organization.create({
            data: organizationData,
        });

        return organization;
    }

    async update(organizationId, organizationData) {
        const organization = await prisma.organization.update({
            where: {
                id: organizationId,
            },
            data: organizationData,
        });

        return organization;
    }

    async findMatching(category) {
        const organizations = await prisma.organization.findMany({
            where: {
                isActive: true,
                domains: {
                    has: category,
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return organizations;
    }

    async findAll() {
        const organizations = await prisma.organization.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                _count: {
                    select: {
                        assignments: true,
                        projects: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        return organizations;
    }

    async createAssignment(assignmentData) {
        const assignment = await prisma.organizationAssignment.create({
            data: assignmentData,
            include: {
                organization: true,
                challenge: {
                    include: {
                        media: true,
                    },
                },
            },
        });

        return assignment;
    }

    async findAssignmentById(assignmentId) {
        const assignment = await prisma.organizationAssignment.findUnique({
            where: {
                id: assignmentId,
            },
            include: {
                organization: true,
                challenge: {
                    include: {
                        media: true,
                    },
                },
            },
        });

        return assignment;
    }

    async findOpenAssignmentsByOrganization(organizationId) {
        const assignments = await prisma.organizationAssignment.findMany({
            where: {
                organizationId,
                status: {
                    in: ['PENDING', 'ACCEPTED'],
                },
            },
            include: {
                challenge: {
                    include: {
                        media: true,
                    },
                },
            },
            orderBy: {
                assignedAt: 'desc',
            },
        });

        return assignments;
    }

    async updateAssignment(assignmentId, assignmentData) {
        const assignment = await prisma.organizationAssignment.update({
            where: {
                id: assignmentId,
            },
            data: assignmentData,
            include: {
                organization: true,
                challenge: {
                    include: {
                        media: true,
                    },
                },
            },
        });

        return assignment;
    }

    async updateChallengeStatus(challengeId, status) {
        await prisma.challenge.update({
            where: {
                id: challengeId,
            },
            data: {
                status,
            },
        });
    }

    async countPendingAssignmentsByChallenge(challengeId) {
        const count = await prisma.organizationAssignment.count({
            where: {
                challengeId,
                status: 'PENDING',
            },
        });

        return count;
    }

    async findChallengeStatus(challengeId) {
        const challenge = await prisma.challenge.findUnique({
            where: {
                id: challengeId,
            },
            select: {
                id: true,
                status: true,
            },
        });

        return challenge;
    }

    // when one org accepts, reject all other still-pending assignments
    // of the same challenge so only one org works on it
    async rejectPendingAssignmentsByChallenge(challengeId, excludeAssignmentId) {
        await prisma.organizationAssignment.updateMany({
            where: {
                challengeId,
                status: 'PENDING',
                id: {
                    not: excludeAssignmentId,
                },
            },
            data: {
                status: 'REJECTED',
                respondedAt: new Date(),
            },
        });
    }
}

export default OrganizationRepository;
