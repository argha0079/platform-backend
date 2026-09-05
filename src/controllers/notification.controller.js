import NotificationService from '../services/notification.service.js';

const notificationService = new NotificationService();

export const listNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const notifications = await notificationService.listMyNotifications(userId);

        res.status(200).json({
            success: true,
            message: 'Notifications fetched successfully',
            data: notifications,
        });
    } catch (error) {
        next(error);
    }
};

export const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const count = await notificationService.getUnreadCount(userId);

        res.status(200).json({
            success: true,
            message: 'Unread count fetched successfully',
            data: { count },
        });
    } catch (error) {
        next(error);
    }
};

export const markNotificationRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const notification = await notificationService.markRead(userId, notificationId);

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification,
        });
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;

        await notificationService.markAllRead(userId);

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        next(error);
    }
};
