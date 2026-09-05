import { prisma } from '../config/dbConfig.js';

class NotificationRepository {
    async create(notificationData) {
        const notification = await prisma.notification.create({
            data: notificationData,
        });

        return notification;
    }

    async findByUserId(userId) {
        const notifications = await prisma.notification.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });

        return notifications;
    }

    async countUnread(userId) {
        const count = await prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });

        return count;
    }

    async findById(notificationId) {
        const notification = await prisma.notification.findUnique({
            where: {
                id: notificationId,
            },
        });

        return notification;
    }

    async markRead(notificationId) {
        const notification = await prisma.notification.update({
            where: {
                id: notificationId,
            },
            data: {
                isRead: true,
            },
        });

        return notification;
    }

    async markAllRead(userId) {
        await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
    }
}

export default NotificationRepository;
