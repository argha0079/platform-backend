import { Router } from 'express';

import { authenticateUser } from '../middlewares/auth.middleware.js';
import { syncUser } from '../middlewares/user.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

import {
    getDashboardStats,
    listUsers,
    updateUserRole,
    listChallenges,
    updateChallengeStatus,
    listOrganizations,
    verifyOrganization,
} from '../controllers/admin.controller.js';

const adminRouter = Router();

// GET /api/admin/stats
adminRouter.get('/stats', authenticateUser, syncUser, requireRole('ADMIN'), getDashboardStats);

// GET /api/admin/users
adminRouter.get('/users', authenticateUser, syncUser, requireRole('ADMIN'), listUsers);

// PATCH /api/admin/users/:id/role
adminRouter.patch(
    '/users/:id/role',
    authenticateUser,
    syncUser,
    requireRole('ADMIN'),
    updateUserRole
);

// GET /api/admin/challenges
adminRouter.get('/challenges', authenticateUser, syncUser, requireRole('ADMIN'), listChallenges);

// PATCH /api/admin/challenges/:id/status
adminRouter.patch(
    '/challenges/:id/status',
    authenticateUser,
    syncUser,
    requireRole('ADMIN'),
    updateChallengeStatus
);

// GET /api/admin/organizations
adminRouter.get(
    '/organizations',
    authenticateUser,
    syncUser,
    requireRole('ADMIN'),
    listOrganizations
);

// PATCH /api/admin/organizations/:id/verify
adminRouter.patch(
    '/organizations/:id/verify',
    authenticateUser,
    syncUser,
    requireRole('ADMIN'),
    verifyOrganization
);

export default adminRouter;
