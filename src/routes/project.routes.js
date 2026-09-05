import { Router } from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { syncUser } from "../middlewares/user.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
    listMyProjects,
    getProject,
    updateProject,
    addMilestone,
    listMilestones
} from "../controllers/project.controller.js";


const projectRouter = Router();


// GET /api/projects/me
projectRouter.get(
    "/me",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    listMyProjects
);


// POST /api/projects/:id/milestones
projectRouter.post(
    "/:id/milestones",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    addMilestone
);


// GET /api/projects/:id/milestones
projectRouter.get(
    "/:id/milestones",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    listMilestones
);


// GET /api/projects/:id (org or admin)
projectRouter.get(
    "/:id",
    authenticateUser,
    syncUser,
    getProject
);


// PATCH /api/projects/:id
projectRouter.patch(
    "/:id",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    updateProject
);


export default projectRouter;
