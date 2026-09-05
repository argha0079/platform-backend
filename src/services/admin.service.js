import AdminRepository from '../repositories/admin.repository.js';
import OrganizationService from './organization.service.js';

const ADMIN_ROLE_VALUES = ['USER', 'ORGANIZATION', 'ADMIN'];

const ADMIN_SETTABLE_STATUSES = [
    'SUBMITTED',
    'ASSIGNED',
    'NEEDS_REASSIGNMENT',
    'COMPLETED',
    'DUPLICATE',
    'FAILED',
];

class AdminService {
    constructor() {
        this.adminRepository = new AdminRepository();
        this.organizationService = new OrganizationService();
    }

    async getDashboardStats() {
        return this.adminRepository.getStats();
    }

    async listAllUsers() {
        return this.adminRepository.findAllUsers();
    }

    async updateUserRole(actorId, userId, role) {
        if (!role || !ADMIN_ROLE_VALUES.includes(role)) {
            const error = new Error('role must be one of USER, ORGANIZATION, ADMIN');
            error.statusCode = 400;
            throw error;
        }

        if (actorId === userId) {
            const error = new Error('You cannot change your own role');
            error.statusCode = 400;
            throw error;
        }

        const target = await this.adminRepository.findUserById(userId);

        if (!target) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        return this.adminRepository.updateUserRole(userId, role);
    }

    async listAllChallenges() {
        return this.adminRepository.findAllChallenges();
    }

    async updateChallengeStatus(challengeId, status) {
        if (!status || !ADMIN_SETTABLE_STATUSES.includes(status)) {
            const error = new Error(`status must be one of ${ADMIN_SETTABLE_STATUSES.join(', ')}`);
            error.statusCode = 400;
            throw error;
        }

        const challenge = await this.adminRepository.findChallengeById(challengeId);

        if (!challenge) {
            const error = new Error('Challenge not found');
            error.statusCode = 404;
            throw error;
        }

        return this.adminRepository.updateChallengeStatus(challengeId, status);
    }

    async listAllOrganizations() {
        return this.organizationService.listOrganizations();
    }

    async verifyOrganization(organizationId, isVerified) {
        if (typeof isVerified !== 'boolean') {
            const error = new Error('isVerified must be a boolean');
            error.statusCode = 400;
            throw error;
        }

        const organization = await this.adminRepository.findOrganizationById(organizationId);

        if (!organization) {
            const error = new Error('Organization not found');
            error.statusCode = 404;
            throw error;
        }

        return this.adminRepository.updateOrganization(organizationId, { isVerified });
    }
}

export default AdminService;
