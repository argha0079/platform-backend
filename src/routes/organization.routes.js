import { Router } from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { syncUser } from "../middlewares/user.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
    registerOrganization,
    getMyOrganization,
    updateMyOrganization,
    listOrganizations,
    listAssignedChallenges,
    respondToAssignment
} from "../controllers/organization.controller.js";


const organizationRouter = Router();


// POST /api/organizations/register (any authenticated user)
organizationRouter.post(
    "/register",
    authenticateUser,
    syncUser,
    registerOrganization
);


// GET /api/organizations (admin)
organizationRouter.get(
    "/",
    authenticateUser,
    syncUser,
    requireRole("ADMIN"),
    listOrganizations
);


// GET /api/organizations/me
organizationRouter.get(
    "/me",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    getMyOrganization
);


// PATCH /api/organizations/me
organizationRouter.patch(
    "/me",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    updateMyOrganization
);


// GET /api/organizations/me/challenges
organizationRouter.get(
    "/me/challenges",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    listAssignedChallenges
);


// PATCH /api/organizations/me/assignments/:assignmentId
organizationRouter.patch(
    "/me/assignments/:assignmentId",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    respondToAssignment
);


export default organizationRouter;
