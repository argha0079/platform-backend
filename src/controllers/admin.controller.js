import AdminService from '../services/admin.service.js';

const adminService = new AdminService();

export const getDashboardStats = async (req, res, next) => {
    try {
        const stats = await adminService.getDashboardStats();

        res.status(200).json({
            success: true,
            message: 'Dashboard stats fetched successfully',
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

export const listUsers = async (req, res, next) => {
    try {
        const users = await adminService.listAllUsers();

        res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

export const updateUserRole = async (req, res, next) => {
    try {
        const actorId = req.user.id;
        const userId = req.params.id;
        const { role } = req.body;

        const user = await adminService.updateUserRole(actorId, userId, role);

        res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const listChallenges = async (req, res, next) => {
    try {
        const challenges = await adminService.listAllChallenges();

        res.status(200).json({
            success: true,
            message: 'Challenges fetched successfully',
            data: challenges,
        });
    } catch (error) {
        next(error);
    }
};

export const updateChallengeStatus = async (req, res, next) => {
    try {
        const challengeId = req.params.id;
        const { status } = req.body;

        const challenge = await adminService.updateChallengeStatus(challengeId, status);

        res.status(200).json({
            success: true,
            message: 'Challenge status updated successfully',
            data: challenge,
        });
    } catch (error) {
        next(error);
    }
};

export const listOrganizations = async (req, res, next) => {
    try {
        const organizations = await adminService.listAllOrganizations();

        res.status(200).json({
            success: true,
            message: 'Organizations fetched successfully',
            data: organizations,
        });
    } catch (error) {
        next(error);
    }
};

export const verifyOrganization = async (req, res, next) => {
    try {
        const organizationId = req.params.id;
        const { isVerified } = req.body;

        const organization = await adminService.verifyOrganization(organizationId, isVerified);

        res.status(200).json({
            success: true,
            message: 'Organization verification updated successfully',
            data: organization,
        });
    } catch (error) {
        next(error);
    }
};
