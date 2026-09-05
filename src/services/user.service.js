import UserRepository from "../repositories/user.repository.js";

class UserService {
    constructor() {
        this.userRepository = new UserRepository();
    }
    async findUserByClerkId(clerkId) {
        const user = await this.userRepository.findByClerkId(
            clerkId
        );
        return user;
    }
    async createUser(userData) {
        const user = await this.userRepository.create(
            userData
        );
        return user;
    }
    async getOrCreateUser(userData) {
        let user = await this.userRepository.findByClerkId(
            userData.clerkId
        );
        if (!user) {
            user = await this.userRepository.create(
                userData
            );
        }
        return user;
    }
}

export default UserService;