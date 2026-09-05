import { Router } from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { syncUser } from "../middlewares/user.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
    updateMilestone,
    deleteMilestone
} from "../controllers/project.controller.js";


const milestoneRouter = Router();


// PATCH /api/milestones/:milestoneId
milestoneRouter.patch(
    "/:milestoneId",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    updateMilestone
);


// DELETE /api/milestones/:milestoneId
milestoneRouter.delete(
    "/:milestoneId",
    authenticateUser,
    syncUser,
    requireRole("ORGANIZATION"),
    deleteMilestone
);


export default milestoneRouter;
