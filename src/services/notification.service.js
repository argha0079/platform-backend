import NotificationRepository from '../repositories/notification.repository.js';
import logger from '../utils/logger.js';

export const NOTIFICATION_TYPES = {
    CHALLENGE_SUBMITTED: 'CHALLENGE_SUBMITTED',
    CHALLENGE_ASSIGNED: 'CHALLENGE_ASSIGNED',
    CHALLENGE_ACCEPTED: 'CHALLENGE_ACCEPTED',
    CHALLENGE_REJECTED: 'CHALLENGE_REJECTED',
    PROJECT_STARTED: 'PROJECT_STARTED',
    PROJECT_COMPLETED: 'PROJECT_COMPLETED',
};

class NotificationService {
    constructor() {
        this.notificationRepository = new NotificationRepository();
    }

    // fire-and-forget: notifications are a side effect and must never
    // break the main flow, so failures are logged and swallowed here.
    async notify(userId, type, title, message) {
        try {
            await this.notificationRepository.create({
                userId,
                type,
                title,
                message,
            });
        } catch (error) {
            logger.error('Notification failed:', error.message);
        }
    }

    async listMyNotifications(userId) {
        return this.notificationRepository.findByUserId(userId);
    }

    async getUnreadCount(userId) {
        return this.notificationRepository.countUnread(userId);
    }

    async markRead(userId, notificationId) {
        const notification = await this.notificationRepository.findById(notificationId);

        if (!notification) {
            const error = new Error('Notification not found');
            error.statusCode = 404;
            throw error;
        }

        if (notification.userId !== userId) {
            const error = new Error('Notification not found');
            error.statusCode = 404;
            throw error;
        }

        return this.notificationRepository.markRead(notificationId);
    }

    async markAllRead(userId) {
        await this.notificationRepository.markAllRead(userId);
    }
}

export default NotificationService;
