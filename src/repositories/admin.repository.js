import { prisma } from "../config/dbConfig.js";


class AdminRepository {

    async getStats() {

        const [
            totalUsers,
            totalOrganizations,
            totalChallenges,
            totalProjects,
            totalAssignments,
            totalMilestones,
            challengesByStatus,
            challengesByPriority,
            challengesByCategory
        ] = await prisma.$transaction([
            prisma.user.count(),
            prisma.organization.count(),
            prisma.challenge.count(),
            prisma.project.count(),
            prisma.organizationAssignment.count(),
            prisma.milestone.count(),
            prisma.challenge.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            prisma.challenge.groupBy({
                by: ["priority"],
                _count: { _all: true }
            }),
            prisma.challenge.groupBy({
                by: ["category"],
                _count: { _all: true }
            })
        ]);

        const countsFrom = (rows, key) => Object.fromEntries(
            rows
                .filter((row) => row[key])
                .map((row) => [row[key], row._count._all])
        );

        return {
            totalUsers,
            totalOrganizations,
            totalChallenges,
            totalProjects,
            totalAssignments,
            totalMilestones,
            challengesByStatus: countsFrom(
                challengesByStatus,
                "status"
            ),
            challengesByPriority: countsFrom(
                challengesByPriority,
                "priority"
            ),
            challengesByCategory: countsFrom(
                challengesByCategory,
                "category"
            )
        };

    }


    async findAllUsers() {

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                clerkId: true,
                createdAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        isVerified: true,
                        isActive: true
                    }
                },
                _count: {
                    select: {
                        challenges: true,
                        notifications: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 100
        });

        return users;

    }


    async findUserById(userId) {

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true
            }
        });

        return user;

    }


    async updateUserRole(userId, role) {

        const user = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                role
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true
            }
        });

        return user;

    }


    async findAllChallenges() {

        const challenges = await prisma.challenge.findMany({
            include: {
                media: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                assignments: {
                    include: {
                        organization: true
                    }
                },
                project: {
                    include: {
                        _count: {
                            select: {
                                milestones: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 100
        });

        return challenges;

    }


    async findChallengeById(challengeId) {

        const challenge = await prisma.challenge.findUnique({
            where: {
                id: challengeId
            },
            select: {
                id: true,
                status: true
            }
        });

        return challenge;

    }


    async updateChallengeStatus(challengeId, status) {

        const challenge = await prisma.challenge.update({
            where: {
                id: challengeId
            },
            data: {
                status
            }
        });

        return challenge;

    }


    async findOrganizationById(organizationId) {

        const organization = await prisma.organization.findUnique({
            where: {
                id: organizationId
            }
        });

        return organization;

    }


    async updateOrganization(organizationId, organizationData) {

        const organization = await prisma.organization.update({
            where: {
                id: organizationId
            },
            data: organizationData
        });

        return organization;

    }

}


export default AdminRepository;