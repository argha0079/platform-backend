import OrganizationService from '../services/organization.service.js';

const organizationService = new OrganizationService();

export const registerOrganization = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, description, type, domains, email, phone, website } = req.body;

        const organization = await organizationService.registerOrganization(userId, {
            name,
            description,
            type,
            domains,
            email,
            phone,
            website,
        });

        res.status(201).json({
            success: true,
            message: 'Organization registered successfully',
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};

export const getMyOrganization = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const organization = await organizationService.getOrganizationByUser(userId);

        if (!organization) {
            const error = new Error('You are not registered as an organization');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            message: 'Organization fetched successfully',
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};

export const updateMyOrganization = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, description, type, domains, email, phone, website } = req.body;

        const organization = await organizationService.updateOrganization(userId, {
            name,
            description,
            type,
            domains,
            email,
            phone,
            website,
        });

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};

export const listOrganizations = async (req, res, next) => {
    try {
        const organizations = await organizationService.listOrganizations();

        res.status(200).json({
            success: true,
            message: 'Organizations fetched successfully',
            data: organizations,
        });
    } catch (error) {
        next(error);
    }
};

export const listAssignedChallenges = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const assignments = await organizationService.listAssignedChallenges(userId);

        res.status(200).json({
            success: true,
            message: 'Assigned challenges fetched successfully',
            data: assignments,
        });
    } catch (error) {
        next(error);
    }
};

export const respondToAssignment = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const assignmentId = req.params.assignmentId;
        const { response } = req.body;

        if (!response || !['ACCEPT', 'REJECT'].includes(response)) {
            const error = new Error('response must be either ACCEPT or REJECT');
            error.statusCode = 400;
            throw error;
        }

        const assignment = await organizationService.respondToAssignment(
            userId,
            assignmentId,
            response
        );

        res.status(200).json({
            success: true,
            message: response === 'ACCEPT' ? 'Assignment accepted' : 'Assignment rejected',
            data: assignment,
        });
    } catch (error) {
        next(error);
    }
};
