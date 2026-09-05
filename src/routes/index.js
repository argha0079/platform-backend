import { Router } from "express";

import userRouter from "./user.routes.js";
import challengeRouter from "./challenge.routes.js";


const apiRouter = Router();


// user routes
apiRouter.use("/users", userRouter);

// challenge routes
apiRouter.use("/challenges", challengeRouter);


export default apiRouter;