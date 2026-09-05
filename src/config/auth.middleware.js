import { getAuth } from "@clerk/express";


export const authenticateUser = (req, res, next) => {
    const { isAuthenticated, userId } = getAuth(req);
    if (!isAuthenticated) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }
    req.clerkId = userId;
    next();

};