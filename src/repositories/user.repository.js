import { prisma } from '../config/dbConfig.js';

class UserRepository {
    async findByClerkId(clerkId) {
        const user = await prisma.user.findUnique({
            where: {
                clerkId,
            },
        });
        return user;
    }
    async findById(userId) {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
        return user;
    }
    async findByEmail(email) {
        if (!email) {
            return null;
        }
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });
        return user;
    }
    async findByPhone(phone) {
        if (!phone) {
            return null;
        }
        const user = await prisma.user.findUnique({
            where: {
                phone,
            },
        });
        return user;
    }
    async create(userData) {
        const user = await prisma.user.create({
            data: userData,
        });
        return user;
    }
}

export default UserRepository;
