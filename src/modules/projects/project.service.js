import crypto from "crypto";

import Project from "../../models/project/project.model.js";

/* =========================================================
   CLIENT ACCESS TOKEN
   ========================================================= */

const generateClientAccessToken = () => {
  const plainToken =
    crypto
      .randomBytes(32)
      .toString("hex");

  const hashedToken =
    crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

  return {
    plainToken,
    hashedToken,
  };
};

const hashClientAccessToken = (
  token
) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

/* =========================================================
   HELPERS
   ========================================================= */

const escapeRegex = (
  value = ""
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const mergeNestedObject = (
  currentValue,
  newValue
) => {
  const currentObject =
    currentValue &&
    typeof currentValue.toObject ===
      "function"
      ? currentValue.toObject()
      : currentValue || {};

  return {
    ...currentObject,
    ...newValue,
  };
};

/* =========================================================
   REMOVE PROTECTED PROJECT FIELDS

   Project Reference Number backend automatically generate
   karega.

   Frontend ya direct API request isay control nahi kar sakti.
   ========================================================= */

const sanitizeCreateProjectData = (
  projectData = {}
) => {
  const sanitizedData = {
    ...projectData,
  };

  delete sanitizedData.projectCode;
  delete sanitizedData.projectReferenceNo;

  delete sanitizedData.createdBy;
  delete sanitizedData.updatedBy;

  delete sanitizedData.clientAccessToken;
  delete sanitizedData.lastClientAccessAt;

  return sanitizedData;
};

const sanitizeUpdateProjectData = (
  updateData = {}
) => {
  const sanitizedData = {
    ...updateData,
  };

  delete sanitizedData.projectCode;
  delete sanitizedData.projectReferenceNo;

  delete sanitizedData.createdBy;
  delete sanitizedData.updatedBy;

  delete sanitizedData.clientAccessToken;
  delete sanitizedData.lastClientAccessAt;

  return sanitizedData;
};

/* =========================================================
   PROJECT REFERENCE ALIAS FOR LEAN RESPONSES

   Mongoose document JSON mein alias automatically available
   hai.

   Lean responses mein manually add karna zaroori hai.
   ========================================================= */

const addProjectReferenceNo = (
  project
) => {
  if (!project) {
    return project;
  }

  return {
    ...project,

    projectReferenceNo:
      project.projectReferenceNo ||
      project.projectCode ||
      "",
  };
};

/* =========================================================
   DUPLICATE AUTO REFERENCE ERROR

   Existing database mein pehle se ZSP-000001 waghera ho aur
   counter fresh start ho, to service next number retry karegi.
   ========================================================= */

const isProjectReferenceDuplicateError = (
  error
) => {
  if (
    !error ||
    error.code !== 11000
  ) {
    return false;
  }

  return Boolean(
    error.keyPattern?.projectCode ||
    error.keyValue?.projectCode ||
    String(error.message).includes(
      "projectCode"
    )
  );
};

/* =========================================================
   CREATE PROJECT WITH AUTOMATIC REFERENCE

   Model automatically generates:

   ZSP-000001
   ZSP-000002
   ZSP-000003
   ========================================================= */

const createProjectWithAutomaticReference =
  async (
    projectPayload,
    maximumAttempts = 25
  ) => {
    let lastError = null;

    for (
      let attempt = 1;
      attempt <= maximumAttempts;
      attempt += 1
    ) {
      try {
        return await Project.create(
          projectPayload
        );
      } catch (error) {
        lastError = error;

        if (
          !isProjectReferenceDuplicateError(
            error
          )
        ) {
          throw error;
        }

        /*
          Duplicate automatic reference ki surat mein
          naya Project document create hoga aur model
          next counter number generate karega.
        */
      }
    }

    const error = new Error(
      "Unable to generate a unique Project Reference Number."
    );

    error.statusCode = 500;
    error.cause = lastError;

    throw error;
  };

/* =========================================================
   CREATE PROJECT
   ========================================================= */

export const createProjectService =
  async (
    projectData,
    userId
  ) => {
    const sanitizedProjectData =
      sanitizeCreateProjectData(
        projectData
      );

    const {
      plainToken,
      hashedToken,
    } =
      generateClientAccessToken();

    const projectPayload = {
      ...sanitizedProjectData,

      /*
        projectCode intentionally supplied nahi hai.

        Project model automatically Project Reference Number
        generate karega.
      */

      projectLead:
        sanitizedProjectData
          .projectLead ||
        userId,

      createdBy:
        userId,

      updatedBy:
        userId,

      clientAccessToken:
        hashedToken,

      clientAccessEnabled:
        sanitizedProjectData
          .clientAccessEnabled !==
        undefined
          ? Boolean(
              sanitizedProjectData
                .clientAccessEnabled
            )
          : true,

      settings: {
        riskRegisterIdEnabled:
          sanitizedProjectData
            .settings
            ?.riskRegisterIdEnabled ===
          true,
      },
    };

    const project =
      await createProjectWithAutomaticReference(
        projectPayload
      );

    return {
      project,

      projectReferenceNo:
        project.projectCode,

      clientAccessToken:
        plainToken,
    };
  };

/* =========================================================
   GET ALL PROJECTS
   ========================================================= */

export const getProjectsService =
  async (
    queryParams = {}
  ) => {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      projectType,
      overallRiskLevel,
      city,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = queryParams;

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const limitNumber =
      Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        100
      );

    const filter = {};

    if (
      typeof status === "string" &&
      status.trim()
    ) {
      filter.status =
        status
          .trim()
          .toLowerCase();
    }

    if (
      typeof projectType ===
        "string" &&
      projectType.trim()
    ) {
      filter.projectType =
        projectType
          .trim()
          .toLowerCase();
    }

    if (
      typeof overallRiskLevel ===
        "string" &&
      overallRiskLevel.trim()
    ) {
      filter.overallRiskLevel =
        overallRiskLevel
          .trim()
          .toLowerCase();
    }

    if (
      typeof city === "string" &&
      city.trim()
    ) {
      filter["site.city"] = {
        $regex:
          escapeRegex(
            city.trim()
          ),

        $options: "i",
      };
    }

    if (
      typeof search === "string" &&
      search.trim()
    ) {
      const safeSearch =
        escapeRegex(
          search.trim()
        );

      filter.$or = [
        {
          projectCode: {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          title: {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          "client.name": {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          "client.company": {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          "site.name": {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          "site.location": {
            $regex:
              safeSearch,

            $options: "i",
          },
        },
      ];
    }

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "startDate",
      "expectedCompletionDate",
      "projectCode",
      "projectReferenceNo",
      "status",
      "overallRiskLevel",
      "title",
    ];

    const requestedSortField =
      allowedSortFields.includes(
        sortBy
      )
        ? sortBy
        : "createdAt";

    /*
      projectReferenceNo database alias hai.
      Actual database field projectCode hai.
    */

    const selectedSortField =
      requestedSortField ===
      "projectReferenceNo"
        ? "projectCode"
        : requestedSortField;

    const selectedSortOrder =
      String(sortOrder)
        .trim()
        .toLowerCase() ===
      "asc"
        ? 1
        : -1;

    const skip =
      (
        pageNumber - 1
      ) * limitNumber;

    const [
      rawProjects,
      totalProjects,
    ] =
      await Promise.all([
        Project.find(filter)
          .populate(
            "projectLead",
            "name email role avatar"
          )
          .populate(
            "createdBy",
            "name email role"
          )
          .sort({
            [selectedSortField]:
              selectedSortOrder,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Project.countDocuments(
          filter
        ),
      ]);

    const projects =
      rawProjects.map(
        addProjectReferenceNo
      );

    const totalPages =
      Math.ceil(
        totalProjects /
        limitNumber
      );

    return {
      projects,

      pagination: {
        currentPage:
          pageNumber,

        totalPages,

        totalProjects,

        limit:
          limitNumber,

        hasNextPage:
          pageNumber <
          totalPages,

        hasPreviousPage:
          pageNumber > 1,
      },
    };
  };

/* =========================================================
   GET ONE PROJECT
   ========================================================= */

export const getProjectByIdService =
  async (
    projectId
  ) => {
    const project =
      await Project.findById(
        projectId
      )
        .populate(
          "projectLead",
          "name email phone role avatar"
        )
        .populate(
          "teamMembers",
          "name email phone role avatar"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .populate(
          "updatedBy",
          "name email role"
        );

    if (!project) {
      const error =
        new Error(
          "Project not found"
        );

      error.statusCode = 404;

      throw error;
    }

    return project;
  };

/* =========================================================
   UPDATE PROJECT
   ========================================================= */

export const updateProjectService =
  async (
    projectId,
    updateData,
    userId
  ) => {
    const project =
      await Project.findById(
        projectId
      );

    if (!project) {
      const error =
        new Error(
          "Project not found"
        );

      error.statusCode = 404;

      throw error;
    }

    const sanitizedUpdateData =
      sanitizeUpdateProjectData(
        updateData
      );

    const allowedFields = [
      "title",
      "description",
      "projectType",
      "systemCapacityKW",
      "auditDate",
      "startDate",
      "expectedCompletionDate",
      "actualCompletionDate",
      "status",
      "overallRiskLevel",
      "projectLead",
      "teamMembers",
      "clientAccessEnabled",
      "clientAccessExpiresAt",
      "notes",
    ];

    allowedFields.forEach(
      (field) => {
        if (
          sanitizedUpdateData[
            field
          ] !== undefined
        ) {
          project[field] =
            sanitizedUpdateData[
              field
            ];
        }
      }
    );

    if (
      sanitizedUpdateData
        .client !== undefined
    ) {
      project.client =
        mergeNestedObject(
          project.client,
          sanitizedUpdateData
            .client
        );
    }

    if (
      sanitizedUpdateData
        .site !== undefined
    ) {
      project.site =
        mergeNestedObject(
          project.site,
          sanitizedUpdateData
            .site
        );
    }

    if (
      sanitizedUpdateData
        .settings !== undefined
    ) {
      project.settings =
        mergeNestedObject(
          project.settings,
          sanitizedUpdateData
            .settings
        );
    }

    if (
      sanitizedUpdateData
        .progress !== undefined
    ) {
      project.progress =
        mergeNestedObject(
          project.progress,
          sanitizedUpdateData
            .progress
        );
    }

    if (
      sanitizedUpdateData
        .riskSummary !== undefined
    ) {
      project.riskSummary =
        mergeNestedObject(
          project.riskSummary,
          sanitizedUpdateData
            .riskSummary
        );
    }

    project.updatedBy =
      userId;

    await project.save();

    return getProjectByIdService(
      projectId
    );
  };

/* =========================================================
   ARCHIVE PROJECT
   ========================================================= */

export const archiveProjectService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await Project.findById(
        projectId
      );

    if (!project) {
      const error =
        new Error(
          "Project not found"
        );

      error.statusCode = 404;

      throw error;
    }

    project.status =
      "archived";

    project.clientAccessEnabled =
      false;

    project.updatedBy =
      userId;

    await project.save();

    return project;
  };

/* =========================================================
   PERMANENTLY DELETE PROJECT
   ========================================================= */

export const permanentlyDeleteProjectService =
  async (
    projectId
  ) => {
    const project =
      await Project.findByIdAndDelete(
        projectId
      );

    if (!project) {
      const error =
        new Error(
          "Project not found"
        );

      error.statusCode = 404;

      throw error;
    }

    return project;
  };

/* =========================================================
   REGENERATE CLIENT ACCESS TOKEN
   ========================================================= */

export const regenerateClientAccessTokenService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await Project.findById(
        projectId
      ).select(
        "+clientAccessToken"
      );

    if (!project) {
      const error =
        new Error(
          "Project not found"
        );

      error.statusCode = 404;

      throw error;
    }

    const {
      plainToken,
      hashedToken,
    } =
      generateClientAccessToken();

    project.clientAccessToken =
      hashedToken;

    project.clientAccessEnabled =
      true;

    project.updatedBy =
      userId;

    await project.save();

    return {
      projectId:
        project._id,

      projectCode:
        project.projectCode,

      projectReferenceNo:
        project.projectCode,

      clientAccessToken:
        plainToken,
    };
  };

/* =========================================================
   REVOKE CLIENT ACCESS
   ========================================================= */

export const revokeClientAccessService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await Project.findById(
        projectId
      );

    if (!project) {
      const error =
        new Error(
          "Project not found"
        );

      error.statusCode = 404;

      throw error;
    }

    project.clientAccessEnabled =
      false;

    project.updatedBy =
      userId;

    await project.save();

    return project;
  };

/* =========================================================
   PUBLIC PROJECT ACCESS
   ========================================================= */

export const getProjectByAccessTokenService =
  async (
    accessToken
  ) => {
    const normalizedToken =
      typeof accessToken ===
        "string"
        ? accessToken.trim()
        : "";

    if (!normalizedToken) {
      const error =
        new Error(
          "Project access token is required"
        );

      error.statusCode = 400;

      throw error;
    }

    const hashedToken =
      hashClientAccessToken(
        normalizedToken
      );

    const project =
      await Project.findOne({
        clientAccessToken:
          hashedToken,

        clientAccessEnabled:
          true,
      });

    if (!project) {
      const error =
        new Error(
          "Invalid or expired project access link"
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      project
        .clientAccessExpiresAt &&
      new Date(
        project
          .clientAccessExpiresAt
      ) < new Date()
    ) {
      const error =
        new Error(
          "Project access link has expired"
        );

      error.statusCode = 403;

      throw error;
    }

    project.lastClientAccessAt =
      new Date();

    await project.save({
      validateBeforeSave:
        false,
    });

    return {
      id:
        project._id,

      projectCode:
        project.projectCode,

      projectReferenceNo:
        project.projectCode,

      title:
        project.title,

      description:
        project.description,

      projectType:
        project.projectType,

      client: {
        name:
          project.client.name,

        company:
          project.client.company,
      },

      site:
        project.site,

      systemCapacityKW:
        project.systemCapacityKW,

      auditDate:
        project.auditDate,

      startDate:
        project.startDate,

      expectedCompletionDate:
        project
          .expectedCompletionDate,

      actualCompletionDate:
        project
          .actualCompletionDate,

      status:
        project.status,

      overallRiskLevel:
        project
          .overallRiskLevel,

      settings:
        project.settings,

      progress:
        project.progress,

      riskSummary:
        project.riskSummary,

      createdAt:
        project.createdAt,

      updatedAt:
        project.updatedAt,
    };
  };