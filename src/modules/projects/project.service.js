import mongoose from "mongoose";
import crypto from "crypto";

import Project from "../../models/project/project.model.js";


/* =========================================================
   DERIVED PROJECT METRICS

   Project document ke progress / riskSummary fields ko
   actual Task aur Evidence collections se synchronize karta hai.

   Source of truth:
   - Task collection (physical MongoDB collection currently: risks)
   - risk_evidences collection

   Mapping:
   Task.status "in_progress" -> riskSummary.inProgress
   Task.status "complete"    -> riskSummary.closed

   rectification:
   completed tasks / total tasks

   evidence:
   tasks having BOTH before + after evidence / total tasks

   overall:
   rectification + evidence ka average.
   Testing aur Action Plan values preserve ki jati hain aur
   overall calculation mein tab include hoti hain jab unki
   value greater than 0 ho.

   Is approach se existing project/client pages stale stored
   zero values return nahi karengi.
   ========================================================= */

/*
  Physical MongoDB collection names are intentionally preserved
  during the Risk -> Task Register migration so existing data is
  not lost.

  Application terminology is now Task Register.
*/

const TASK_COLLECTION_NAME =
  "risks";

const EVIDENCE_COLLECTION_NAME =
  "risk_evidences";

const clampPercentage = (
  value
) => {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return 0;
  }

  return Math.min(
    Math.max(
      Math.round(
        numericValue
      ),
      0
    ),
    100
  );
};

export const syncProjectDerivedMetrics =
  async (
    projectId
  ) => {
    if (
      !mongoose.isValidObjectId(
        projectId
      )
    ) {
      const error =
        new Error(
          "Project ID is invalid"
        );

      error.statusCode = 400;

      throw error;
    }

    const projectObjectId =
      new mongoose.Types.ObjectId(
        projectId
      );

    const [
      project,
      riskSummaryResult,
      evidenceSummaryResult,
    ] =
      await Promise.all([
        Project.findById(
          projectObjectId
        ),

        mongoose.connection
          .collection(
            TASK_COLLECTION_NAME
          )
          .aggregate([
            {
              $match: {
                projectId:
                  projectObjectId,
              },
            },
            {
              $group: {
                _id: null,

                totalRiskGroups: {
                  $sum: 1,
                },

                inProgress: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$status",
                          "in_progress",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                closed: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$status",
                          "complete",
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
          .toArray(),

        mongoose.connection
          .collection(
            EVIDENCE_COLLECTION_NAME
          )
          .aggregate([
            {
              $match: {
                projectId:
                  projectObjectId,
              },
            },
            {
              $group: {
                _id: {
                  riskId:
                    "$riskId",

                  evidenceType:
                    "$evidenceType",
                },

                count: {
                  $sum: 1,
                },
              },
            },
            {
              $group: {
                _id:
                  "$_id.riskId",

                beforeCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$_id.evidenceType",
                          "before",
                        ],
                      },
                      "$count",
                      0,
                    ],
                  },
                },

                afterCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$_id.evidenceType",
                          "after",
                        ],
                      },
                      "$count",
                      0,
                    ],
                  },
                },

                totalEvidence: {
                  $sum:
                    "$count",
                },
              },
            },
            {
              $group: {
                _id: null,

                totalEvidence: {
                  $sum:
                    "$totalEvidence",
                },

                risksWithCompleteEvidence: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          {
                            $gt: [
                              "$beforeCount",
                              0,
                            ],
                          },
                          {
                            $gt: [
                              "$afterCount",
                              0,
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
          .toArray(),
      ]);

    if (!project) {
      const error =
        new Error(
          "Project not found"
        );

      error.statusCode = 404;

      throw error;
    }

    const riskMetrics =
      riskSummaryResult[0] ||
      {
        totalRiskGroups: 0,
        inProgress: 0,
        closed: 0,
      };

    const evidenceMetrics =
      evidenceSummaryResult[0] ||
      {
        totalEvidence: 0,
        risksWithCompleteEvidence: 0,
      };

    const totalRiskGroups =
      Number(
        riskMetrics
          .totalRiskGroups ||
          0
      );

    const closed =
      Number(
        riskMetrics.closed ||
          0
      );

    const inProgress =
      Number(
        riskMetrics
          .inProgress ||
          0
      );

    const totalEvidence =
      Number(
        evidenceMetrics
          .totalEvidence ||
          0
      );

    const risksWithCompleteEvidence =
      Number(
        evidenceMetrics
          .risksWithCompleteEvidence ||
          0
      );

    const rectification =
      totalRiskGroups > 0
        ? clampPercentage(
            (
              closed /
              totalRiskGroups
            ) * 100
          )
        : 0;

    const evidence =
      totalRiskGroups > 0
        ? clampPercentage(
            (
              risksWithCompleteEvidence /
              totalRiskGroups
            ) * 100
          )
        : 0;

    /*
      Testing / Action Plan ko overwrite nahi karna.
      Ye apne modules se control honge.
    */

    const testing =
      clampPercentage(
        project.progress
          ?.testing ||
          0
      );

    const actionPlan =
      clampPercentage(
        project.progress
          ?.actionPlan ||
          0
      );

    /*
      Overall calculation:
      Risk-based modules always participate when risks exist.
      Testing / Action Plan tab participate karte hain jab
      unka progress explicitly > 0 ho.

      Example:
      2/2 risks complete + both evidence complete:
      rectification = 100
      evidence = 100
      overall = 100
    */

    const overallComponents =
      [];

    if (
      totalRiskGroups > 0
    ) {
      overallComponents.push(
        rectification,
        evidence
      );
    }

    if (testing > 0) {
      overallComponents.push(
        testing
      );
    }

    if (actionPlan > 0) {
      overallComponents.push(
        actionPlan
      );
    }

    const overall =
      overallComponents.length >
      0
        ? clampPercentage(
            overallComponents.reduce(
              (
                total,
                current
              ) =>
                total +
                current,
              0
            ) /
              overallComponents.length
          )
        : 0;

    /*
      Current Task model mein severity field nahi hai.
      Is liye existing severity counters preserve kiye jate hain.
    */

    project.riskSummary =
      {
        ...(
          project.riskSummary
            ?.toObject?.() ||
          project.riskSummary ||
          {}
        ),

        totalRiskGroups,
        totalEvidence,

        inProgress,
        closed,
      };

    project.progress =
      {
        ...(
          project.progress
            ?.toObject?.() ||
          project.progress ||
          {}
        ),

        overall,
        rectification,
        evidence,
        testing,
        actionPlan,
      };

    await project.save({
      validateBeforeSave:
        false,
    });

    return project;
  };

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

  /*
    Project lifecycle generic Edit Project se control nahi hoga.
    Dedicated lifecycle actions use hongi.
  */

  delete sanitizedData.status;
  delete sanitizedData.actualCompletionDate;
  delete sanitizedData.startedAt;
  delete sanitizedData.putOnHoldAt;
  delete sanitizedData.resumedAt;
  delete sanitizedData.archivedAt;

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
        taskRegisterIdEnabled:
          sanitizedProjectData
            .settings
            ?.taskRegisterIdEnabled ===
            true ||
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

   Project return karne se pehle derived Task / Evidence
   metrics synchronize ki jati hain.
   ========================================================= */

export const getProjectByIdService =
  async (
    projectId
  ) => {
    await syncProjectDerivedMetrics(
      projectId
    );

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
   PROJECT LIFECYCLE

   Core workflow:

   draft -> active -> on_hold -> active -> completed -> archived

   Important:

   - startDate / expectedCompletionDate are schedule dates.
   - expectedCompletionDate crossing NEVER auto-completes a project.
   - actualCompletionDate is set only by Mark Completed.
   - generic Edit Project cannot change lifecycle status.
   ========================================================= */

const createLifecycleError = (
  statusCode,
  message
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

const getLifecycleProject =
  async (projectId) => {
    if (
      !mongoose.isValidObjectId(
        projectId
      )
    ) {
      throw createLifecycleError(
        400,
        "Project ID is invalid."
      );
    }

    const project =
      await Project.findById(
        projectId
      );

    if (!project) {
      throw createLifecycleError(
        404,
        "Project not found."
      );
    }

    return project;
  };

const saveLifecycleProject =
  async (
    project,
    userId
  ) => {
    project.updatedBy =
      userId;

    await project.save();

    return getProjectByIdService(
      project._id.toString()
    );
  };

/* =========================================================
   START PROJECT

   draft -> active
   ========================================================= */

export const startProjectService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await getLifecycleProject(
        projectId
      );

    if (
      project.status !==
      "draft"
    ) {
      throw createLifecycleError(
        409,
        `Only Draft projects can be started. Current status: ${project.status}.`
      );
    }

    project.status =
      "active";

    project.startedAt =
      project.startedAt ||
      new Date();

    project.putOnHoldAt =
      null;

    project.resumedAt =
      null;

    project.actualCompletionDate =
      null;

    return saveLifecycleProject(
      project,
      userId
    );
  };

/* =========================================================
   PUT PROJECT ON HOLD

   active -> on_hold
   ========================================================= */

export const putProjectOnHoldService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await getLifecycleProject(
        projectId
      );

    if (
      project.status !==
      "active"
    ) {
      throw createLifecycleError(
        409,
        `Only Active projects can be put on hold. Current status: ${project.status}.`
      );
    }

    project.status =
      "on_hold";

    project.putOnHoldAt =
      new Date();

    return saveLifecycleProject(
      project,
      userId
    );
  };

/* =========================================================
   RESUME PROJECT

   on_hold -> active
   ========================================================= */

export const resumeProjectService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await getLifecycleProject(
        projectId
      );

    if (
      project.status !==
      "on_hold"
    ) {
      throw createLifecycleError(
        409,
        `Only On Hold projects can be resumed. Current status: ${project.status}.`
      );
    }

    project.status =
      "active";

    project.resumedAt =
      new Date();

    project.putOnHoldAt =
      null;

    return saveLifecycleProject(
      project,
      userId
    );
  };

/* =========================================================
   MARK PROJECT COMPLETED

   active / on_hold -> completed

   Completion date is actual operational completion date.

   Progress is NOT forced to 100 here. Current derived
   progress remains evidence/task-data driven.
   ========================================================= */

export const completeProjectService =
  async (
    projectId,
    userId
  ) => {
    /*
      First refresh current derived metrics before completing.
      This preserves the latest project progress snapshot.
    */

    await syncProjectDerivedMetrics(
      projectId
    );

    const project =
      await getLifecycleProject(
        projectId
      );

    if (
      ![
        "active",
        "on_hold",
      ].includes(
        project.status
      )
    ) {
      throw createLifecycleError(
        409,
        `Only Active or On Hold projects can be completed. Current status: ${project.status}.`
      );
    }

    project.status =
      "completed";

    project.actualCompletionDate =
      new Date();

    project.putOnHoldAt =
      null;

    return saveLifecycleProject(
      project,
      userId
    );
  };

/* =========================================================
   REOPEN PROJECT

   completed -> active

   Completion date is cleared because the project is no
   longer considered completed.
   ========================================================= */

export const reopenProjectService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await getLifecycleProject(
        projectId
      );

    if (
      project.status !==
      "completed"
    ) {
      throw createLifecycleError(
        409,
        `Only Completed projects can be reopened. Current status: ${project.status}.`
      );
    }

    project.status =
      "active";

    project.actualCompletionDate =
      null;

    project.resumedAt =
      new Date();

    return saveLifecycleProject(
      project,
      userId
    );
  };

/* =========================================================
   ARCHIVE PROJECT

   completed -> archived

   Archive is a final storage state. Active work should be
   completed first instead of being silently archived.
   ========================================================= */

export const archiveProjectService =
  async (
    projectId,
    userId
  ) => {
    const project =
      await getLifecycleProject(
        projectId
      );

    if (
      project.status ===
      "archived"
    ) {
      return getProjectByIdService(
        projectId
      );
    }

    if (
      project.status !==
      "completed"
    ) {
      throw createLifecycleError(
        409,
        "Only Completed projects can be archived. Mark the project as Completed first."
      );
    }

    project.status =
      "archived";

    project.archivedAt =
      new Date();

    project.clientAccessEnabled =
      false;

    return saveLifecycleProject(
      project,
      userId
    );
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
   PUBLIC TASK REGISTER

   Client tracker ko simple Task Register data deta hai:

   Sr. No.
   Description
   Status
   Before Evidence
   After Evidence

   IMPORTANT:
   Physical MongoDB fields/collections abhi legacy names use
   karte hain:
   tasks -> collection "risks"
   taskId -> evidence field "riskId"

   Is se existing production data safe rahega.
   ========================================================= */

const getPublicProjectTasks =
  async (
    projectId
  ) => {
    const projectObjectId =
      new mongoose.Types.ObjectId(
        projectId
      );

    const tasks =
      await mongoose.connection
        .collection(
          TASK_COLLECTION_NAME
        )
        .find({
          projectId:
            projectObjectId,
        })
        .sort({
          serialNo: 1,
          createdAt: 1,
          _id: 1,
        })
        .project({
          projectId: 1,
          projectCode: 1,
          serialNo: 1,
          description: 1,
          status: 1,
          riskRegisterId: 1,
          taskRegisterId: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .toArray();

    if (
      tasks.length === 0
    ) {
      return [];
    }

    const taskIds =
      tasks.map(
        (task) =>
          task._id
      );

    const evidences =
      await mongoose.connection
        .collection(
          EVIDENCE_COLLECTION_NAME
        )
        .find({
          projectId:
            projectObjectId,

          riskId: {
            $in:
              taskIds,
          },
        })
        .sort({
          createdAt: 1,
          _id: 1,
        })
        .project({
          riskId: 1,
          evidenceType: 1,
          imagePath: 1,
          createdAt: 1,
        })
        .toArray();

    const evidenceByTaskId =
      new Map();

    for (
      const evidence of evidences
    ) {
      const taskId =
        evidence.riskId
          ?.toString?.();

      if (!taskId) {
        continue;
      }

      if (
        !evidenceByTaskId.has(
          taskId
        )
      ) {
        evidenceByTaskId.set(
          taskId,
          {
            before: [],
            after: [],
          }
        );
      }

      const taskEvidence =
        evidenceByTaskId.get(
          taskId
        );

      if (
        evidence.evidenceType ===
        "before"
      ) {
        taskEvidence.before.push({
          id:
            evidence._id,

          imagePath:
            evidence.imagePath,

          createdAt:
            evidence.createdAt,
        });
      }

      if (
        evidence.evidenceType ===
        "after"
      ) {
        taskEvidence.after.push({
          id:
            evidence._id,

          imagePath:
            evidence.imagePath,

          createdAt:
            evidence.createdAt,
        });
      }
    }

    return tasks.map(
      (
        task,
        index
      ) => {
        const taskEvidence =
          evidenceByTaskId.get(
            task._id.toString()
          ) || {
            before: [],
            after: [],
          };

        return {
          id:
            task._id,

          /*
            Client-facing Sr. No. continuous rahega even if
            stored serialNo mein deletion ki wajah se gap ho.
          */
          displaySrNo:
            index + 1,

          description:
            task.description ||
            "",

          status:
            task.status ===
            "complete"
              ? "complete"
              : "in_progress",

          taskRegisterId:
            task.taskRegisterId ||
            task.riskRegisterId ||
            undefined,

          beforeEvidence:
            taskEvidence.before,

          afterEvidence:
            taskEvidence.after,

          beforeCount:
            taskEvidence.before
              .length,

          afterCount:
            taskEvidence.after
              .length,

          canComplete:
            taskEvidence.before
              .length > 0 &&
            taskEvidence.after
              .length > 0,

          createdAt:
            task.createdAt,

          updatedAt:
            task.updatedAt,
        };
      }
    );
  };

/* =========================================================
   PUBLIC PROJECT TASKS BY CLIENT ACCESS TOKEN

   GET /api/v1/projects/public/access/:accessToken/tasks

   Public / read-only service.
   Authorization header required nahi hai.

   Security:
   - client access token required
   - token hash database se match hota hai
   - clientAccessEnabled true hona chahiye
   - expiry check hoti hai
   - sirf matched project ke Tasks/Evidence return hote hain
   ========================================================= */

export const getPublicProjectTasksService =
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
      }).select(
        "_id clientAccessExpiresAt"
      );

    if (!project) {
      const error =
        new Error(
          "Invalid or expired project access link"
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      project.clientAccessExpiresAt &&
      new Date(
        project.clientAccessExpiresAt
      ) < new Date()
    ) {
      const error =
        new Error(
          "Project access link has expired"
        );

      error.statusCode = 403;

      throw error;
    }

    const tasks =
      await getPublicProjectTasks(
        project._id
      );

    return {
      tasks,

      pagination: {
        currentPage: 1,
        totalPages:
          tasks.length > 0
            ? 1
            : 0,
        totalTasks:
          tasks.length,
        limit:
          tasks.length,
        hasNextPage:
          false,
        hasPreviousPage:
          false,
      },
    };
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

    /*
      Public/client view stale stored zeros use na kare.
      Token se project milne ke baad actual Task/Evidence
      data se metrics synchronize karein.
    */

    await syncProjectDerivedMetrics(
      project._id
    );

    const refreshedProject =
      await Project.findById(
        project._id
      );

    if (refreshedProject) {
      project.progress =
        refreshedProject.progress;

      project.riskSummary =
        refreshedProject.riskSummary;
    }

    const tasks =
      await getPublicProjectTasks(
        project._id
      );

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

      startedAt:
        project.startedAt,

      putOnHoldAt:
        project.putOnHoldAt,

      resumedAt:
        project.resumedAt,

      archivedAt:
        project.archivedAt,

      status:
        project.status,

      scheduleStatus:
        project.scheduleStatus,

      isOverdue:
        project.isOverdue,

      daysOverdue:
        project.daysOverdue,

      overallRiskLevel:
        project
          .overallRiskLevel,

      settings:
        project.settings,

      progress:
        project.progress,

      /*
        Legacy project schema field preserved for existing
        dashboard compatibility.
      */
      riskSummary:
        project.riskSummary,

      taskSummary: {
        totalTasks:
          tasks.length,

        inProgress:
          tasks.filter(
            (task) =>
              task.status ===
              "in_progress"
          ).length,

        completed:
          tasks.filter(
            (task) =>
              task.status ===
              "complete"
          ).length,
      },

      tasks,

      createdAt:
        project.createdAt,

      updatedAt:
        project.updatedAt,
    };
  };