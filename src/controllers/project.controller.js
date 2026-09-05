import ProjectService from "../services/project.service.js";


const projectService = new ProjectService();


export const listMyProjects = async (req, res, next) => {

    try {

        const userId = req.user.id;

        const projects = await projectService.listMyProjects(userId);

        res.status(200).json({
            success: true,
            message: "Projects fetched successfully",
            data: projects
        });

    } catch (error) {

        next(error);

    }

};


export const getProject = async (req, res, next) => {

    try {

        const userId = req.user.id;
        const userRole = req.user.role;
        const projectId = req.params.id;

        const project = await projectService.getProject(
            userId,
            projectId,
            userRole
        );

        res.status(200).json({
            success: true,
            message: "Project fetched successfully",
            data: project
        });

    } catch (error) {

        next(error);

    }

};


export const updateProject = async (req, res, next) => {

    try {

        const userId = req.user.id;
        const projectId = req.params.id;
        const { title, description, status } = req.body;

        const project = await projectService.updateProject(
            userId,
            projectId,
            { title, description, status }
        );

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: project
        });

    } catch (error) {

        next(error);

    }

};


export const addMilestone = async (req, res, next) => {

    try {

        const userId = req.user.id;
        const projectId = req.params.id;
        const { title, description, dueDate } = req.body;

        const milestone = await projectService.addMilestone(
            userId,
            projectId,
            { title, description, dueDate }
        );

        res.status(201).json({
            success: true,
            message: "Milestone added successfully",
            data: milestone
        });

    } catch (error) {

        next(error);

    }

};


export const listMilestones = async (req, res, next) => {

    try {

        const userId = req.user.id;
        const projectId = req.params.id;

        const milestones = await projectService.listMilestones(
            userId,
            projectId
        );

        res.status(200).json({
            success: true,
            message: "Milestones fetched successfully",
            data: milestones
        });

    } catch (error) {

        next(error);

    }

};


export const updateMilestone = async (req, res, next) => {

    try {

        const userId = req.user.id;
        const milestoneId = req.params.milestoneId;
        const { title, description, status, dueDate } = req.body;

        const milestone = await projectService.updateMilestone(
            userId,
            milestoneId,
            { title, description, status, dueDate }
        );

        res.status(200).json({
            success: true,
            message: "Milestone updated successfully",
            data: milestone
        });

    } catch (error) {

        next(error);

    }

};


export const deleteMilestone = async (req, res, next) => {

    try {

        const userId = req.user.id;
        const milestoneId = req.params.milestoneId;

        await projectService.deleteMilestone(userId, milestoneId);

        res.status(200).json({
            success: true,
            message: "Milestone deleted successfully",
            data: null
        });

    } catch (error) {

        next(error);

    }

};
