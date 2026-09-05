export const getCurrentUser = async (req, res, next) => {
    try {
        const user = req.user;
        res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }

};