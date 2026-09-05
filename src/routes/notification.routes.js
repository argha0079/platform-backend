import { Router } from "express";

import { authenticateUser } from "../middlewares/auth.middleware.js";
import { syncUser } from "../middlewares/user.middleware.js";

import {
    listNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead
} from "../controllers/notification.controller.js";


const notificationRouter = Router();


// GET /api/notifications (any authenticated user)
notificationRouter.get(
    "/",
    authenticateUser,
    syncUser,
    listNotifications
);


// GET /api/notifications/unread-count
notificationRouter.get(
    "/unread-count",
    authenticateUser,
    syncUser,
    getUnreadCount
);


// PATCH /api/notifications/read-all
notificationRouter.patch(
    "/read-all",
    authenticateUser,
    syncUser,
    markAllNotificationsRead
);


// PATCH /api/notifications/:id/read
notificationRouter.patch(
    "/:id/read",
    authenticateUser,
    syncUser,
    markNotificationRead
);


export default notificationRouter;