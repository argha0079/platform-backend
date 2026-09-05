import { clerkClient } from "@clerk/express";
import UserService from "../services/user.service.js";
const userService = new UserService();
export const syncUser = async (req, res, next) => {
    try {
        const clerkId = req.clerkId;
        let user = await userService.findUserByClerkId(
            clerkId
        );
        if (!user) {
            const clerkUser = await clerkClient.users.getUser(
                clerkId
            );
            // get primary email
            const primaryEmailId =
                clerkUser.primaryEmailAddressId;


            const primaryEmail =
                clerkUser.emailAddresses.find(
                    (emailAddress) =>
                        emailAddress.id === primaryEmailId
                );
            const email = primaryEmail?.emailAddress;
            // get primary phone number
            const primaryPhoneNumberId = clerkUser.primaryPhoneNumberId;
            const primaryPhoneNumber =
                clerkUser.phoneNumbers.find(
                    (phoneNumber) =>
                        phoneNumber.id === primaryPhoneNumberId
                );
            const phone = primaryPhoneNumber?.phoneNumber;
            // at least one contact method is required
            if (!email && !phone) {
                const error = new Error(
                    "Either email or phone number is required"
                );
                error.statusCode = 400;
                throw error;
            }
            // construct user name
            const name = [
                clerkUser.firstName,
                clerkUser.lastName
            ]
                .filter(Boolean)
                .join(" ") || "User";


            try {
                user = await userService.createUser({
                    clerkId,
                    name,
                    email,
                    phone
                });
            } catch (error) {
                // handle concurrent creation race on unique clerkId
                if (error?.code === "P2002") {
                    user = await userService.findUserByClerkId(
                        clerkId
                    );
                    if (!user) {
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
        }
        // attach database user to request
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};