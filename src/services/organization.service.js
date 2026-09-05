import OrganizationRepository from "../repositories/organization.repository.js";
import NotificationService, { NOTIFICATION_TYPES } from "./notification.service.js";
import { prisma } from "../config/dbConfig.js";


const ORGANIZATION_TYPES = [
    "GOVERNMENT",
    "NGO",
    "ACADEMIC_INSTITUTION",
    "STARTUP",
    "MSME",
    "CORPORATE",
    "RESEARCH_ORGANIZATION",
    "OTHER"
];


class OrganizationService {

    constructor() {

        this.organizationRepository = new OrganizationRepository();
        this.notificationService = new NotificationService();

    }


    // register the requesting user as an organization owner
    async registerOrganization(userId, orgData) {

        const existing = await this.organizationRepository.findByUserId(
            userId
        );

        if (existing) {

            const error = new Error(
                "This user is already registered as an organization"
            );
            error.statusCode = 400;
            throw error;

        }

        if (
            !orgData.name
            || typeof orgData.name !== "string"
            || !orgData.name.trim()
        ) {

            const error = new Error("Organization name is required");
            error.statusCode = 400;
            throw error;

        }

        const type = this.mapOrganizationType(orgData.type);

        const domains = this.normalizeDomains(orgData.domains);

        const organization = await prisma.$transaction(async (tx) => {

            const org = await tx.organization.create({
                data: {
                    userId,
                    name: orgData.name.trim(),
                    description: orgData.description,
                    type,
                    domains,
                    email: orgData.email,
                    phone: orgData.phone,
                    website: orgData.website
                }
            });

            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    role: "ORGANIZATION"
                }
            });

            return org;

        });

        return this.organizationRepository.findById(
            organization.id
        );

    }


    async getOrganizationByUser(userId) {

        const organization = await this.organizationRepository.findByUserId(
            userId
        );

        return organization;

    }


    async getOrganizationById(organizationId) {

        const organization = await this.organizationRepository.findById(
            organizationId
        );

        return organization;

    }


    async updateOrganization(userId, orgData) {

        const organization = await this.organizationRepository.findByUserId(
            userId
        );

        if (!organization) {

            const error = new Error(
                "You are not registered as an organization"
            );
            error.statusCode = 404;
            throw error;

        }

        const updateData = {};

        if (orgData.name !== undefined) {
            updateData.name = orgData.name.trim();
        }

        if (orgData.description !== undefined) {
            updateData.description = orgData.description;
        }

        if (orgData.type !== undefined) {
            updateData.type = this.mapOrganizationType(orgData.type);
        }

        if (orgData.domains !== undefined) {
            updateData.domains = this.normalizeDomains(orgData.domains);
        }

        if (orgData.email !== undefined) {
            updateData.email = orgData.email;
        }

        if (orgData.phone !== undefined) {
            updateData.phone = orgData.phone;
        }

        if (orgData.website !== undefined) {
            updateData.website = orgData.website;
        }

        return this.organizationRepository.update(
            organization.id,
            updateData
        );

    }


    async listOrganizations() {

        return this.organizationRepository.findAll();

    }


    // assign a challenge to matching organizations by domain/category
    async autoAssign(challengeId, category) {

        if (!category) {
            return [];
        }

        const organizations = await this.organizationRepository.findMatching(
            category
        );

        const assignments = [];

        for (const organization of organizations) {

            const assignment = await this.organizationRepository.createAssignment({
                challengeId,
                organizationId: organization.id,
                status: "PENDING",
                source: "AUTOMATIC"
            });

            await this.notificationService.notify(
                organization.userId,
                NOTIFICATION_TYPES.CHALLENGE_ASSIGNED,
                "New challenge assigned",
                `A new challenge "${assignment.challenge?.title || "Untitled"}" has been assigned to your organization.`
            );

            assignments.push(assignment);

        }

        if (assignments.length > 0) {

            await this.organizationRepository.updateChallengeStatus(
                challengeId,
                "ASSIGNED"
            );

        }

        return assignments;

    }


    // admin: assign a challenge to a specific organization
    async manuallyAssign(challengeId, organizationId, remarks) {

        const organization = await this.organizationRepository.findById(
            organizationId
        );

        if (!organization) {

            const error = new Error("Organization not found");
            error.statusCode = 404;
            throw error;

        }

        const assignment = await this.organizationRepository.createAssignment({
            challengeId,
            organizationId,
            status: "PENDING",
            source: "ADMIN",
            remarks
        });

        await this.organizationRepository.updateChallengeStatus(
            challengeId,
            "ASSIGNED"
        );

        await this.notificationService.notify(
            organization.userId,
            NOTIFICATION_TYPES.CHALLENGE_ASSIGNED,
            "New challenge assigned",
            `A new challenge "${assignment.challenge?.title || "Untitled"}" has been assigned to your organization.`
        );

        return assignment;

    }


    async listAssignedChallenges(userId) {

        const organization = await this.organizationRepository.findByUserId(
            userId
        );

        if (!organization) {

            const error = new Error(
                "You are not registered as an organization"
            );
            error.statusCode = 404;
            throw error;

        }

        return this.organizationRepository.findOpenAssignmentsByOrganization(
            organization.id
        );

    }


    async respondToAssignment(userId, assignmentId, response) {

        const organization = await this.organizationRepository.findByUserId(
            userId
        );

        if (!organization) {

            const error = new Error(
                "You are not registered as an organization"
            );
            error.statusCode = 404;
            throw error;

        }

        const assignment = await this.organizationRepository.findAssignmentById(
            assignmentId
        );

        if (!assignment) {

            const error = new Error("Assignment not found");
            error.statusCode = 404;
            throw error;

        }

        if (assignment.organizationId !== organization.id) {

            const error = new Error(
                "This assignment does not belong to your organization"
            );
            error.statusCode = 403;
            throw error;

        }

        if (assignment.status !== "PENDING") {

            const error = new Error(
                "This assignment has already been responded to"
            );
            error.statusCode = 400;
            throw error;

        }

        const accept = response === "ACCEPT";

        // a challenge can only be worked on by ONE organization
        if (accept) {

            const existingProject = await prisma.project.findUnique({
                where: {
                    challengeId: assignment.challengeId
                }
            });

            if (existingProject) {

                const error = new Error(
                    "This challenge is already handled by another organization"
                );
                error.statusCode = 409;
                throw error;

            }

        }

        const updated = await this.organizationRepository.updateAssignment(
            assignmentId,
            {
                status: accept ? "ACCEPTED" : "REJECTED",
                respondedAt: new Date()
            }
        );

        const {
            challengeId: assignedChallengeId,
            organizationId: assignedOrganizationId
        } = updated;

        const submitterId = updated.challenge.userId;
        const challengeTitle = updated.challenge?.title || "Untitled";

        // create a project when the org accepts
        if (accept) {

            await this.organizationRepository
                .rejectPendingAssignmentsByChallenge(
                    assignedChallengeId,
                    assignmentId
                );

            await prisma.project.create({
                data: {
                    challengeId: assignedChallengeId,
                    organizationId: assignedOrganizationId,
                    title: challengeTitle,
                    description: updated.challenge.description,
                    status: "NOT_STARTED"
                }
            });

            await this.organizationRepository.updateChallengeStatus(
                assignedChallengeId,
                "IN_PROGRESS"
            );

            await this.notificationService.notify(
                submitterId,
                NOTIFICATION_TYPES.CHALLENGE_ACCEPTED,
                "Challenge accepted",
                `Your challenge "${challengeTitle}" has been accepted by an organization.`
            );

        } else {

            // flag the challenge for reassignment when no organization
            // has any pending assignment left to respond to
            const remainingPending = await this.organizationRepository
                .countPendingAssignmentsByChallenge(assignedChallengeId);

            if (remainingPending === 0) {

                const currentChallenge = await this.organizationRepository
                    .findChallengeStatus(assignedChallengeId);

                if (
                    currentChallenge
                    && currentChallenge.status !== "COMPLETED"
                    && currentChallenge.status !== "IN_PROGRESS"
                    && currentChallenge.status !== "PROCESSING"
                    && currentChallenge.status !== "FAILED"
                ) {

                    await this.organizationRepository.updateChallengeStatus(
                        assignedChallengeId,
                        "NEEDS_REASSIGNMENT"
                    );

                }

            }

            await this.notificationService.notify(
                submitterId,
                NOTIFICATION_TYPES.CHALLENGE_REJECTED,
                "Challenge rejected",
                `Your challenge "${challengeTitle}" was rejected by an organization and is waiting for reassignment.`
            );

        }

        return updated;

    }


    mapOrganizationType(value) {

        const mapped = String(value || "").toUpperCase();

        return ORGANIZATION_TYPES.includes(mapped)
            ? mapped
            : "OTHER";

    }


    normalizeDomains(domains) {

        if (!Array.isArray(domains)) {
            return [];
        }

        return domains
            .map((domain) => String(domain).toUpperCase())
            .filter((domain) => domain.length > 0);

    }

}


export default OrganizationService;
