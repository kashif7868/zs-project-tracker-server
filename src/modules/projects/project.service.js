import crypto from "crypto";
import Project from "../../models/project/project.model.js";

const generateClientAccessToken = () => {
  const plainToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  return {
    plainToken,
    hashedToken,
  };
};

const hashClientAccessToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const mergeNestedObject = (currentValue, newValue) => {
  const currentObject =
    currentValue && typeof currentValue.toObject === "function"
      ? currentValue.toObject()
      : currentValue || {};

  return {
    ...currentObject,
    ...newValue,
  };
};

/**
 * Create a new project
 */
export const createProjectService = async (projectData, userId) => {
  const normalizedProjectCode = projectData.projectCode
    .trim()
    .toUpperCase();

  const existingProject = await Project.findOne({
    projectCode: normalizedProjectCode,
  });

  if (existingProject) {
    const error = new Error(
      `Project with code ${normalizedProjectCode} already exists`
    );
    error.statusCode = 409;
    throw error;
  }

  const { plainToken, hashedToken } = generateClientAccessToken();

  const project = await Project.create({
    ...projectData,
    projectCode: normalizedProjectCode,

    projectLead: projectData.projectLead || userId,

    createdBy: userId,

    updatedBy: userId,

    clientAccessToken: hashedToken,

    clientAccessEnabled:
      projectData.clientAccessEnabled !== undefined
        ? projectData.clientAccessEnabled
        : true,
  });

  return {
    project,
    clientAccessToken: plainToken,
  };
};

/**
 * Get all projects with pagination, filtering and searching
 */
export const getProjectsService = async (queryParams = {}) => {
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

  const pageNumber = Math.max(Number(page) || 1, 1);

  const limitNumber = Math.min(
    Math.max(Number(limit) || 10, 1),
    100
  );

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (projectType) {
    filter.projectType = projectType;
  }

  if (overallRiskLevel) {
    filter.overallRiskLevel = overallRiskLevel;
  }

  if (city) {
    filter["site.city"] = {
      $regex: escapeRegex(city),
      $options: "i",
    };
  }

  if (search && typeof search === "string") {
    const safeSearch = escapeRegex(search.trim());

    filter.$or = [
      {
        projectCode: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        title: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        "client.name": {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        "client.company": {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        "site.name": {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        "site.location": {
          $regex: safeSearch,
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
    "status",
    "overallRiskLevel",
  ];

  const selectedSortField = allowedSortFields.includes(sortBy)
    ? sortBy
    : "createdAt";

  const selectedSortOrder =
    String(sortOrder).toLowerCase() === "asc" ? 1 : -1;

  const skip = (pageNumber - 1) * limitNumber;

  const [projects, totalProjects] = await Promise.all([
    Project.find(filter)
      .populate("projectLead", "name email role avatar")
      .populate("createdBy", "name email role")
      .sort({
        [selectedSortField]: selectedSortOrder,
      })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    Project.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalProjects / limitNumber);

  return {
    projects,

    pagination: {
      currentPage: pageNumber,
      totalPages,
      totalProjects,
      limit: limitNumber,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1,
    },
  };
};

/**
 * Get one project by MongoDB ID
 */
export const getProjectByIdService = async (projectId) => {
  const project = await Project.findById(projectId)
    .populate("projectLead", "name email phone role avatar")
    .populate("teamMembers", "name email phone role avatar")
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  return project;
};

/**
 * Update project
 */
export const updateProjectService = async (
  projectId,
  updateData,
  userId
) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

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

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      project[field] = updateData[field];
    }
  });

  if (updateData.client !== undefined) {
    project.client = mergeNestedObject(
      project.client,
      updateData.client
    );
  }

  if (updateData.site !== undefined) {
    project.site = mergeNestedObject(
      project.site,
      updateData.site
    );
  }

  if (updateData.progress !== undefined) {
    project.progress = mergeNestedObject(
      project.progress,
      updateData.progress
    );
  }

  if (updateData.riskSummary !== undefined) {
    project.riskSummary = mergeNestedObject(
      project.riskSummary,
      updateData.riskSummary
    );
  }

  project.updatedBy = userId;

  await project.save();

  return getProjectByIdService(projectId);
};

/**
 * Archive a project instead of permanently deleting it
 */
export const archiveProjectService = async (
  projectId,
  userId
) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  project.status = "archived";
  project.clientAccessEnabled = false;
  project.updatedBy = userId;

  await project.save();

  return project;
};

/**
 * Permanently delete project
 */
export const permanentlyDeleteProjectService = async (
  projectId
) => {
  const project = await Project.findByIdAndDelete(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  return project;
};

/**
 * Generate a new secure client access token
 */
export const regenerateClientAccessTokenService = async (
  projectId,
  userId
) => {
  const project = await Project.findById(projectId).select(
    "+clientAccessToken"
  );

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  const { plainToken, hashedToken } =
    generateClientAccessToken();

  project.clientAccessToken = hashedToken;
  project.clientAccessEnabled = true;
  project.updatedBy = userId;

  await project.save();

  return {
    projectId: project._id,
    projectCode: project.projectCode,
    clientAccessToken: plainToken,
  };
};

/**
 * Disable client access
 */
export const revokeClientAccessService = async (
  projectId,
  userId
) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  project.clientAccessEnabled = false;
  project.updatedBy = userId;

  await project.save();

  return project;
};

/**
 * Public/client project access by secure token
 */
export const getProjectByAccessTokenService = async (
  accessToken
) => {
  const hashedToken = hashClientAccessToken(accessToken);

  const project = await Project.findOne({
    clientAccessToken: hashedToken,
    clientAccessEnabled: true,
  });

  if (!project) {
    const error = new Error(
      "Invalid or expired project access link"
    );
    error.statusCode = 404;
    throw error;
  }

  if (
    project.clientAccessExpiresAt &&
    new Date(project.clientAccessExpiresAt) < new Date()
  ) {
    const error = new Error("Project access link has expired");
    error.statusCode = 403;
    throw error;
  }

  project.lastClientAccessAt = new Date();

  await project.save({
    validateBeforeSave: false,
  });

  return {
    id: project._id,
    projectCode: project.projectCode,
    title: project.title,
    description: project.description,
    projectType: project.projectType,

    client: {
      name: project.client.name,
      company: project.client.company,
    },

    site: project.site,

    systemCapacityKW: project.systemCapacityKW,

    auditDate: project.auditDate,
    startDate: project.startDate,
    expectedCompletionDate:
      project.expectedCompletionDate,
    actualCompletionDate: project.actualCompletionDate,

    status: project.status,
    overallRiskLevel: project.overallRiskLevel,

    progress: project.progress,
    riskSummary: project.riskSummary,

    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
};