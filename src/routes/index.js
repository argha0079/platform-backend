import { Router } from 'express';

import userRouter from './user.routes.js';
import challengeRouter from './challenge.routes.js';
import organizationRouter from './organization.routes.js';
import projectRouter from './project.routes.js';
import milestoneRouter from './milestone.routes.js';
import adminRouter from './admin.routes.js';
import notificationRouter from './notification.routes.js';

const apiRouter = Router();

// user routes
apiRouter.use('/users', userRouter);

// challenge routes
apiRouter.use('/challenges', challengeRouter);

// organization routes
apiRouter.use('/organizations', organizationRouter);

// project routes
apiRouter.use('/projects', projectRouter);

// milestone routes
apiRouter.use('/milestones', milestoneRouter);

// admin routes
apiRouter.use('/admin', adminRouter);

// notification routes
apiRouter.use('/notifications', notificationRouter);

export default apiRouter;
