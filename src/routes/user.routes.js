import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { syncUser } from "../middlewares/user.middleware.js";
import { getCurrentUser } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/me", authenticateUser, syncUser, getCurrentUser);

export default userRouter;