import { Router } from "express";

import userRouter from "./user.routes.js";


const apiRouter = Router();


// user routes
apiRouter.use("/users", userRouter);


export default apiRouter;