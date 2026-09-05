export const requireRole = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Insufficient permissions',
            });
        }

        return next();
    };
};
