import {
  createProjectService,
  getProjectsService,
  getProjectByIdService,
  updateProjectService,
  archiveProjectService,
  permanentlyDeleteProjectService,
  regenerateClientAccessTokenService,
  revokeClientAccessService,
  getProjectByAccessTokenService,
} from "./project.service.js";

const getAuthenticatedUserId = (req) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return userId;
};

/**
 * @desc    Create a new project
 * @route   POST /api/v1/projects
 * @access  Admin / Super Admin
 */
export const createProject = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    const result = await createProjectService(
      req.body,
      userId
    );

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: {
        project: result.project,
        clientAccessToken: result.clientAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all projects
 * @route   GET /api/v1/projects
 * @access  Admin / Super Admin
 */
export const getProjects = async (req, res, next) => {
  try {
    const result = await getProjectsService(req.query);

    return res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      data: result.projects,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get project by ID
 * @route   GET /api/v1/projects/:projectId
 * @access  Admin / Super Admin
 */
export const getProjectById = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await getProjectByIdService(projectId);

    return res.status(200).json({
      success: true,
      message: "Project fetched successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update project
 * @route   PATCH /api/v1/projects/:projectId
 * @access  Admin / Super Admin
 */
export const updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const userId = getAuthenticatedUserId(req);

    const project = await updateProjectService(
      projectId,
      req.body,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive project
 * @route   PATCH /api/v1/projects/:projectId/archive
 * @access  Admin / Super Admin
 */
export const archiveProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const userId = getAuthenticatedUserId(req);

    const project = await archiveProjectService(
      projectId,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Project archived successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently delete project
 * @route   DELETE /api/v1/projects/:projectId/permanent
 * @access  Super Admin
 */
export const permanentlyDeleteProject = async (
  req,
  res,
  next
) => {
  try {
    const { projectId } = req.params;

    const project =
      await permanentlyDeleteProjectService(projectId);

    return res.status(200).json({
      success: true,
      message: "Project permanently deleted successfully",
      data: {
        id: project._id,
        projectCode: project.projectCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate a new client access token
 * @route   POST /api/v1/projects/:projectId/client-access
 * @access  Admin / Super Admin
 */
export const regenerateClientAccessToken = async (
  req,
  res,
  next
) => {
  try {
    const { projectId } = req.params;

    const userId = getAuthenticatedUserId(req);

    const result =
      await regenerateClientAccessTokenService(
        projectId,
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "New client access token generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke client access
 * @route   PATCH /api/v1/projects/:projectId/client-access/revoke
 * @access  Admin / Super Admin
 */
export const revokeClientAccess = async (
  req,
  res,
  next
) => {
  try {
    const { projectId } = req.params;

    const userId = getAuthenticatedUserId(req);

    const project = await revokeClientAccessService(
      projectId,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Client access revoked successfully",
      data: {
        id: project._id,
        projectCode: project.projectCode,
        clientAccessEnabled: project.clientAccessEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Open project through secure client token
 * @route   GET /api/v1/projects/public/access/:accessToken
 * @access  Public through secure token
 */
export const getPublicProjectByAccessToken = async (
  req,
  res,
  next
) => {
  try {
    const { accessToken } = req.params;

    if (!accessToken) {
      const error = new Error(
        "Project access token is required"
      );
      error.statusCode = 400;
      throw error;
    }

    const project =
      await getProjectByAccessTokenService(accessToken);

    return res.status(200).json({
      success: true,
      message: "Project tracker fetched successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};