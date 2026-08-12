import {
  createProjectService,
  getProjectsService,
  getProjectByIdService,
  updateProjectService,

  startProjectService,
  putProjectOnHoldService,
  resumeProjectService,
  completeProjectService,
  reopenProjectService,

  archiveProjectService,
  permanentlyDeleteProjectService,
  regenerateClientAccessTokenService,
  revokeClientAccessService,
  getProjectByAccessTokenService,
  getPublicProjectTasksService,
} from "./project.service.js";

/* =========================================================
   AUTHENTICATED USER ID
   ========================================================= */

const getAuthenticatedUserId = (
  req
) => {
  const userId =
    req.user?._id ||
    req.user?.id;

  if (!userId) {
    const error =
      new Error(
        "Authentication required"
      );

    error.statusCode = 401;

    throw error;
  }

  return userId;
};

/* =========================================================
   PROJECT REFERENCE HELPER

   Database field abhi projectCode hai.

   Frontend/display name:

   projectReferenceNo
   ========================================================= */

const getProjectReferenceNo = (
  project
) => {
  return (
    project?.projectReferenceNo ||
    project?.projectCode ||
    ""
  );
};

/* =========================================================
   CREATE PROJECT

   POST /api/v1/projects

   Permission:
   projects.create
   ========================================================= */

export const createProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const userId =
        getAuthenticatedUserId(
          req
        );

      const result =
        await createProjectService(
          req.body,
          userId
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Project created successfully",

          data: {
            project:
              result.project,

            projectReferenceNo:
              result
                .projectReferenceNo ||
              getProjectReferenceNo(
                result.project
              ),

            clientAccessToken:
              result
                .clientAccessToken,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET PROJECTS

   GET /api/v1/projects

   Permission:
   projects.view
   ========================================================= */

export const getProjects =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getProjectsService(
          req.query
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Projects fetched successfully",

          data:
            result.projects,

          pagination:
            result.pagination,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET PROJECT BY ID

   GET /api/v1/projects/:projectId

   Permission:
   projects.view
   ========================================================= */

export const getProjectById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const project =
        await getProjectByIdService(
          projectId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project fetched successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE PROJECT DETAILS

   PATCH /api/v1/projects/:projectId

   Permission:
   projects.update

   Lifecycle status is NOT changed here.
   Start/Hold/Resume/Complete/Reopen actions use dedicated
   endpoints.
   ========================================================= */

export const updateProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await updateProjectService(
          projectId,
          req.body,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project updated successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   START PROJECT

   PATCH /api/v1/projects/:projectId/start

   draft -> active

   Permission:
   projects.update
   ========================================================= */

export const startProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await startProjectService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project started successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   PUT PROJECT ON HOLD

   PATCH /api/v1/projects/:projectId/hold

   active -> on_hold

   Permission:
   projects.update
   ========================================================= */

export const putProjectOnHold =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await putProjectOnHoldService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project put on hold successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   RESUME PROJECT

   PATCH /api/v1/projects/:projectId/resume

   on_hold -> active

   Permission:
   projects.update
   ========================================================= */

export const resumeProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await resumeProjectService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project resumed successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   MARK PROJECT COMPLETED

   PATCH /api/v1/projects/:projectId/complete

   active / on_hold -> completed

   actualCompletionDate backend automatically sets.

   Permission:
   projects.update
   ========================================================= */

export const completeProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await completeProjectService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project marked as completed successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   REOPEN PROJECT

   PATCH /api/v1/projects/:projectId/reopen

   completed -> active

   Permission:
   projects.update
   ========================================================= */

export const reopenProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await reopenProjectService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project reopened successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   ARCHIVE PROJECT

   PATCH /api/v1/projects/:projectId/archive

   completed -> archived

   Permission:
   projects.archive
   ========================================================= */

export const archiveProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await archiveProjectService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project archived successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   PERMANENTLY DELETE PROJECT

   DELETE /api/v1/projects/:projectId/permanent

   Access:
   Super Admin only
   ========================================================= */

export const permanentlyDeleteProject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const project =
        await permanentlyDeleteProjectService(
          projectId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project permanently deleted successfully",

          data: {
            id:
              project._id,

            projectCode:
              project.projectCode,

            projectReferenceNo:
              getProjectReferenceNo(
                project
              ),
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   REGENERATE CLIENT ACCESS TOKEN

   POST /api/v1/projects/:projectId/client-access

   Permission:
   projects.client_access
   ========================================================= */

export const regenerateClientAccessToken =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const result =
        await regenerateClientAccessTokenService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "New client access token generated successfully",

          data: result,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   REVOKE CLIENT ACCESS

   PATCH /api/v1/projects/:projectId/client-access/revoke

   Permission:
   projects.client_access
   ========================================================= */

export const revokeClientAccess =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        projectId,
      } = req.params;

      const userId =
        getAuthenticatedUserId(
          req
        );

      const project =
        await revokeClientAccessService(
          projectId,
          userId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Client access revoked successfully",

          data: {
            id:
              project._id,

            projectCode:
              project.projectCode,

            projectReferenceNo:
              getProjectReferenceNo(
                project
              ),

            clientAccessEnabled:
              project
                .clientAccessEnabled,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   PUBLIC PROJECT ACCESS

   GET /api/v1/projects/public/access/:accessToken
   ========================================================= */

export const getPublicProjectByAccessToken =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        accessToken,
      } = req.params;

      if (
        typeof accessToken !==
          "string" ||
        !accessToken.trim()
      ) {
        const error =
          new Error(
            "Project access token is required"
          );

        error.statusCode = 400;

        throw error;
      }

      const project =
        await getProjectByAccessTokenService(
          accessToken.trim()
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Project tracker fetched successfully",

          data: project,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   PUBLIC PROJECT TASK REGISTER

   GET /api/v1/projects/public/access/:accessToken/tasks

   Public / read-only endpoint.

   Authorization header required nahi hai.
   Client access token hi access authorize karega.

   Response:
   - current Project ke Tasks
   - continuous displaySrNo
   - Before Evidence
   - After Evidence
   - status
   - description
   ========================================================= */

export const getPublicProjectTasks =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        accessToken,
      } = req.params;

      if (
        typeof accessToken !==
          "string" ||
        !accessToken.trim()
      ) {
        const error =
          new Error(
            "Project access token is required"
          );

        error.statusCode = 400;

        throw error;
      }

      const result =
        await getPublicProjectTasksService(
          accessToken.trim()
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Public Task Register fetched successfully",

          data: {
            tasks:
              result.tasks,

            pagination:
              result.pagination,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

