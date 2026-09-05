import { prisma } from '../config/dbConfig.js';

class ProjectRepository {
    async findById(projectId) {
        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
            },
            include: {
                challenge: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                            },
                        },
                        media: true,
                    },
                },
                organization: true,
                milestones: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        return project;
    }

    async findByOrganizationId(organizationId) {
        const projects = await prisma.project.findMany({
            where: {
                organizationId,
            },
            include: {
                challenge: {
                    include: {
                        media: true,
                    },
                },
                organization: true,
                milestones: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
                _count: {
                    select: {
                        milestones: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return projects;
    }

    async update(projectId, projectData) {
        const project = await prisma.project.update({
            where: {
                id: projectId,
            },
            data: projectData,
        });

        return project;
    }

    async createMilestone(milestoneData) {
        const milestone = await prisma.milestone.create({
            data: milestoneData,
            include: {
                project: {
                    include: {
                        organization: true,
                    },
                },
            },
        });

        return milestone;
    }

    async findMilestoneById(milestoneId) {
        const milestone = await prisma.milestone.findUnique({
            where: {
                id: milestoneId,
            },
            include: {
                project: {
                    include: {
                        organization: true,
                    },
                },
            },
        });

        return milestone;
    }

    async findMilestonesByProjectId(projectId) {
        const milestones = await prisma.milestone.findMany({
            where: {
                projectId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return milestones;
    }

    async updateMilestone(milestoneId, milestoneData) {
        const milestone = await prisma.milestone.update({
            where: {
                id: milestoneId,
            },
            data: milestoneData,
        });

        return milestone;
    }

    async deleteMilestone(milestoneId) {
        await prisma.milestone.delete({
            where: {
                id: milestoneId,
            },
        });
    }

    async countMilestones(projectId) {
        const count = await prisma.milestone.count({
            where: {
                projectId,
            },
        });

        return count;
    }
}

export default ProjectRepository;
