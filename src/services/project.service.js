import ProjectRepository from '../repositories/project.repository.js';
import OrganizationRepository from '../repositories/organization.repository.js';
import NotificationService, { NOTIFICATION_TYPES } from './notification.service.js';
import { prisma } from '../config/dbConfig.js';

const PROJECT_STATUS_VALUES = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

const MILESTONE_STATUS_VALUES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

class ProjectService {
    constructor() {
        this.projectRepository = new ProjectRepository();
        this.organizationRepository = new OrganizationRepository();
        this.notificationService = new NotificationService();
    }

    async listMyProjects(userId) {
        const organization = await this.getOrganizationForUser(userId);

        return this.projectRepository.findByOrganizationId(organization.id);
    }

    async getProject(userId, projectId, userRole) {
        const project = await this.projectRepository.findById(projectId);

        if (!project) {
            const error = new Error('Project not found');
            error.statusCode = 404;
            throw error;
        }

        if (userRole === 'ADMIN') {
            return project;
        }

        const organization = await this.getOrganizationForUser(userId);

        if (project.organizationId !== organization.id) {
            const error = new Error('Project not found');
            error.statusCode = 404;
            throw error;
        }

        return project;
    }

    async updateProject(userId, projectId, projectData) {
        const project = await this.getProject(userId, projectId, 'ORGANIZATION');

        const previousStatus = project.status;

        const updateData = {};

        if (projectData.title !== undefined) {
            if (
                !projectData.title ||
                typeof projectData.title !== 'string' ||
                !projectData.title.trim()
            ) {
                const error = new Error('Project title cannot be empty');
                error.statusCode = 400;
                throw error;
            }
            updateData.title = projectData.title.trim();
        }

        if (projectData.description !== undefined) {
            updateData.description = projectData.description;
        }

        if (projectData.status !== undefined) {
            updateData.status = this.mapProjectStatus(projectData.status);
        }

        const updated = await this.projectRepository.update(projectId, updateData);

        // reflect project completion on the underlying challenge
        if (updateData.status === 'COMPLETED') {
            await prisma.challenge.update({
                where: {
                    id: project.challengeId,
                },
                data: {
                    status: 'COMPLETED',
                },
            });

            if (previousStatus !== 'COMPLETED') {
                await this.notificationService.notify(
                    project.challenge.user.id,
                    NOTIFICATION_TYPES.PROJECT_COMPLETED,
                    'Project completed',
                    `Work on your challenge "${project.title}" has been completed.`
                );
            }
        } else if (updateData.status === 'IN_PROGRESS') {
            await prisma.challenge.update({
                where: {
                    id: project.challengeId,
                },
                data: {
                    status: 'IN_PROGRESS',
                },
            });

            if (previousStatus === 'NOT_STARTED') {
                await this.notificationService.notify(
                    project.challenge.user.id,
                    NOTIFICATION_TYPES.PROJECT_STARTED,
                    'Project started',
                    `Work has started on your challenge "${project.title}".`
                );
            }
        } else if (updateData.status === 'CANCELLED' && previousStatus !== 'COMPLETED') {
            // the org gave up: free the challenge back into the
            // reassignment pool so an admin can hand it to another org.
            // deleting the project is required — Project.challengeId is
            // @unique, so a leftover CANCELLED row would 409 any future
            // ACCEPT for the challenge (milestones cascade away).
            await prisma.project.delete({
                where: {
                    id: projectId,
                },
            });

            await prisma.challenge.update({
                where: {
                    id: project.challengeId,
                },
                data: {
                    status: 'NEEDS_REASSIGNMENT',
                },
            });
        }

        return updated;
    }

    async addMilestone(userId, projectId, milestoneData) {
        const project = await this.getProject(userId, projectId, 'ORGANIZATION');

        if (
            !milestoneData.title ||
            typeof milestoneData.title !== 'string' ||
            !milestoneData.title.trim()
        ) {
            const error = new Error('Milestone title is required');
            error.statusCode = 400;
            throw error;
        }

        const milestone = await this.projectRepository.createMilestone({
            projectId,
            title: milestoneData.title.trim(),
            description: milestoneData.description,
            dueDate: milestoneData.dueDate ? new Date(milestoneData.dueDate) : null,
        });

        // starting work marks the project in progress
        if (project.status === 'NOT_STARTED') {
            await this.projectRepository.update(projectId, {
                status: 'IN_PROGRESS',
            });

            await prisma.challenge.update({
                where: {
                    id: project.challengeId,
                },
                data: {
                    status: 'IN_PROGRESS',
                },
            });

            await this.notificationService.notify(
                project.challenge.user.id,
                NOTIFICATION_TYPES.PROJECT_STARTED,
                'Project started',
                `Work has started on your challenge "${project.title}".`
            );
        }

        return milestone;
    }

    async listMilestones(userId, projectId) {
        const project = await this.getProject(userId, projectId, 'ORGANIZATION');

        return this.projectRepository.findMilestonesByProjectId(project.id);
    }

    async updateMilestone(userId, milestoneId, milestoneData) {
        const milestone = await this.getOwnedMilestone(userId, milestoneId);

        const updateData = {};

        if (milestoneData.title !== undefined) {
            if (
                !milestoneData.title ||
                typeof milestoneData.title !== 'string' ||
                !milestoneData.title.trim()
            ) {
                const error = new Error('Milestone title cannot be empty');
                error.statusCode = 400;
                throw error;
            }
            updateData.title = milestoneData.title.trim();
        }

        if (milestoneData.description !== undefined) {
            updateData.description = milestoneData.description;
        }

        if (milestoneData.dueDate !== undefined) {
            updateData.dueDate = milestoneData.dueDate ? new Date(milestoneData.dueDate) : null;
        }

        if (milestoneData.status !== undefined) {
            const status = this.mapMilestoneStatus(milestoneData.status);

            updateData.status = status;

            if (status === 'COMPLETED') {
                updateData.completedAt = milestone.completedAt || new Date();
            } else {
                updateData.completedAt = null;
            }
        }

        return this.projectRepository.updateMilestone(milestoneId, updateData);
    }

    async deleteMilestone(userId, milestoneId) {
        await this.getOwnedMilestone(userId, milestoneId);

        await this.projectRepository.deleteMilestone(milestoneId);
    }

    async countMilestones(userId, projectId) {
        const project = await this.getProject(userId, projectId, 'ORGANIZATION');

        return this.projectRepository.countMilestones(project.id);
    }

    // helpers

    async getOrganizationForUser(userId) {
        const organization = await this.organizationRepository.findByUserId(userId);

        if (!organization) {
            const error = new Error('You are not registered as an organization');
            error.statusCode = 404;
            throw error;
        }

        return organization;
    }

    async getOwnedMilestone(userId, milestoneId) {
        const organization = await this.getOrganizationForUser(userId);

        const milestone = await this.projectRepository.findMilestoneById(milestoneId);

        if (!milestone) {
            const error = new Error('Milestone not found');
            error.statusCode = 404;
            throw error;
        }

        if (milestone.project.organizationId !== organization.id) {
            const error = new Error('Milestone not found');
            error.statusCode = 404;
            throw error;
        }

        return milestone;
    }

    mapProjectStatus(value) {
        const mapped = String(value || '').toUpperCase();

        return PROJECT_STATUS_VALUES.includes(mapped) ? mapped : 'NOT_STARTED';
    }

    mapMilestoneStatus(value) {
        const mapped = String(value || '').toUpperCase();

        return MILESTONE_STATUS_VALUES.includes(mapped) ? mapped : 'PENDING';
    }
}

export default ProjectService;
