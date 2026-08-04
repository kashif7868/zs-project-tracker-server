import mongoose from "mongoose";

import Risk from "../../models/risks/risk.model.js";

/* =========================================================
   CONSTANTS
   ========================================================= */

const RISK_STATUSES = [
  "in_progress",
  "complete",
];

const RISK_SORT_FIELDS = [
  "serialNo",
  "riskRegisterId",
  "projectCode",
  "description",
  "status",
  "createdAt",
  "updatedAt",
];

const EVIDENCE_COLLECTION_NAME =
  "risk_evidences";

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  statusCode,
  message
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = statusCode;

  return error;
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const validateMongoId = (
  value,
  fieldName
) => {
  if (
    !mongoose.isValidObjectId(value)
  ) {
    throw createServiceError(
      400,
      `${fieldName} is invalid.`
    );
  }
};

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeRiskStatus = (
  status
) => {
  const normalizedStatus =
    normalizeText(
      status
    ).toLowerCase();

  if (
    !RISK_STATUSES.includes(
      normalizedStatus
    )
  ) {
    throw createServiceError(
      400,
      "Status must be in_progress or complete."
    );
  }

  return normalizedStatus;
};

/* =========================================================
   DUPLICATE ERROR HANDLER
   ========================================================= */

const handleDuplicateRiskError = (
  error
) => {
  if (error?.code !== 11000) {
    throw error;
  }

  const duplicateFields =
    Object.keys(
      error.keyPattern ||
        error.keyValue ||
        {}
    );

  if (
    duplicateFields.includes(
      "serialNo"
    )
  ) {
    throw createServiceError(
      409,
      "This serial number already exists in the selected project."
    );
  }

  if (
    duplicateFields.includes(
      "riskRegisterId"
    )
  ) {
    throw createServiceError(
      409,
      "This Risk Register ID already exists in the selected project."
    );
  }

  throw createServiceError(
    409,
    "A duplicate Risk record already exists."
  );
};

/* =========================================================
   PROJECT HELPERS
   ========================================================= */

const getProjectModel = () => {
  const Project =
    mongoose.models.Project;

  if (!Project) {
    throw createServiceError(
      500,
      "Project model is not registered."
    );
  }

  return Project;
};

const fetchProjectDetails = async (
  projectId
) => {
  validateMongoId(
    projectId,
    "Project ID"
  );

  const Project =
    getProjectModel();

  const project =
    await Project.findById(
      projectId
    )
      .select(
        "_id projectCode code"
      )
      .lean();

  if (!project) {
    throw createServiceError(
      404,
      "Selected project was not found."
    );
  }

  const projectCode =
    normalizeText(
      project.projectCode ||
        project.code
    ).toUpperCase();

  if (!projectCode) {
    throw createServiceError(
      400,
      "Selected project does not have a project code."
    );
  }

  return {
    projectId: project._id,
    projectCode,
  };
};

/* =========================================================
   EVIDENCE COLLECTION
   ========================================================= */

const getEvidenceCollection = () => {
  return mongoose.connection.collection(
    EVIDENCE_COLLECTION_NAME
  );
};

/* =========================================================
   EMPTY EVIDENCE SUMMARY
   ========================================================= */

const getEmptyEvidenceSummary = () => {
  return {
    before: [],
    after: [],

    beforeCount: 0,
    afterCount: 0,

    canMarkComplete: false,
  };
};

/* =========================================================
   SINGLE RISK EVIDENCE SUMMARY
   ========================================================= */

export const getRiskEvidenceSummary =
  async (riskId) => {
    validateMongoId(
      riskId,
      "Risk ID"
    );

    const evidenceCollection =
      getEvidenceCollection();

    const riskObjectId =
      new mongoose.Types.ObjectId(
        riskId
      );

    const summary =
      await evidenceCollection
        .aggregate([
          {
            $match: {
              riskId: riskObjectId,
            },
          },

          {
            $group: {
              _id:
                "$evidenceType",

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray();

    const evidenceSummary =
      getEmptyEvidenceSummary();

    summary.forEach((item) => {
      if (
        item._id === "before"
      ) {
        evidenceSummary.beforeCount =
          item.count;
      }

      if (
        item._id === "after"
      ) {
        evidenceSummary.afterCount =
          item.count;
      }
    });

    evidenceSummary.canMarkComplete =
      evidenceSummary.beforeCount >
        0 &&
      evidenceSummary.afterCount >
        0;

    return evidenceSummary;
  };

/* =========================================================
   MULTIPLE RISKS EVIDENCE SUMMARY
   ========================================================= */

const getEvidenceSummaryMap = async (
  riskIds
) => {
  const summaryMap =
    new Map();

  if (
    !Array.isArray(riskIds) ||
    riskIds.length === 0
  ) {
    return summaryMap;
  }

  const evidenceCollection =
    getEvidenceCollection();

  const summary =
    await evidenceCollection
      .aggregate([
        {
          $match: {
            riskId: {
              $in: riskIds,
            },
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
      ])
      .toArray();

  summary.forEach((item) => {
    const riskId =
      item._id.riskId.toString();

    const currentSummary =
      summaryMap.get(
        riskId
      ) ||
      getEmptyEvidenceSummary();

    if (
      item._id.evidenceType ===
      "before"
    ) {
      currentSummary.beforeCount =
        item.count;
    }

    if (
      item._id.evidenceType ===
      "after"
    ) {
      currentSummary.afterCount =
        item.count;
    }

    currentSummary.canMarkComplete =
      currentSummary.beforeCount >
        0 &&
      currentSummary.afterCount >
        0;

    summaryMap.set(
      riskId,
      currentSummary
    );
  });

  return summaryMap;
};

/* =========================================================
   COMPLETE BEFORE/AFTER EVIDENCE
   ========================================================= */

export const getRiskEvidence =
  async (riskId) => {
    validateMongoId(
      riskId,
      "Risk ID"
    );

    const evidenceCollection =
      getEvidenceCollection();

    const evidenceRecords =
      await evidenceCollection
        .find({
          riskId:
            new mongoose.Types.ObjectId(
              riskId
            ),
        })
        .sort({
          createdAt: 1,
        })
        .toArray();

    const before = [];
    const after = [];

    evidenceRecords.forEach(
      (record) => {
        if (
          record.evidenceType ===
          "before"
        ) {
          before.push(record);
        }

        if (
          record.evidenceType ===
          "after"
        ) {
          after.push(record);
        }
      }
    );

    return {
      before,
      after,

      beforeCount:
        before.length,

      afterCount:
        after.length,

      canMarkComplete:
        before.length > 0 &&
        after.length > 0,
    };
  };

/* =========================================================
   CREATE RISK
   ========================================================= */

export const createRiskService =
  async ({
    projectId,
    serialNo,
    riskRegisterId,
    description,
  }) => {
    try {
      const project =
        await fetchProjectDetails(
          projectId
        );

      const risk =
        await Risk.create({
          projectId:
            project.projectId,

          projectCode:
            project.projectCode,

          serialNo:
            normalizeText(
              serialNo
            ),

          riskRegisterId:
            normalizeText(
              riskRegisterId
            ).toUpperCase(),

          description:
            normalizeText(
              description
            ),

          status:
            "in_progress",
        });

      return {
        risk,

        evidence:
          getEmptyEvidenceSummary(),
      };
    } catch (error) {
      handleDuplicateRiskError(
        error
      );
    }
  };

/* =========================================================
   GET RISKS
   ========================================================= */

export const getRisksService =
  async ({
    projectId,
    search,
    status,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) => {
    const currentPage =
      Math.max(
        Number.parseInt(
          page,
          10
        ) || 1,
        1
      );

    const currentLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 20,
          1
        ),
        100
      );

    const skip =
      (currentPage - 1) *
      currentLimit;

    const filter = {};

    const normalizedProjectId =
      normalizeText(
        projectId
      );

    const normalizedSearch =
      normalizeText(
        search
      );

    const normalizedStatus =
      normalizeText(
        status
      );

    if (normalizedProjectId) {
      validateMongoId(
        normalizedProjectId,
        "Project ID"
      );

      filter.projectId =
        new mongoose.Types.ObjectId(
          normalizedProjectId
        );
    }

    if (normalizedStatus) {
      filter.status =
        normalizeRiskStatus(
          normalizedStatus
        );
    }

    if (normalizedSearch) {
      const safeSearch =
        escapeRegex(
          normalizedSearch
        );

      filter.$or = [
        {
          serialNo: {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          riskRegisterId: {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          projectCode: {
            $regex:
              safeSearch,

            $options: "i",
          },
        },

        {
          description: {
            $regex:
              safeSearch,

            $options: "i",
          },
        },
      ];
    }

    const receivedSortBy =
      normalizeText(
        sortBy
      );

    const normalizedSortBy =
      RISK_SORT_FIELDS.includes(
        receivedSortBy
      )
        ? receivedSortBy
        : "createdAt";

    const normalizedSortOrder =
      normalizeText(
        sortOrder
      ).toLowerCase() ===
      "asc"
        ? 1
        : -1;

    const [
      risks,
      totalRecords,
    ] = await Promise.all([
      Risk.find(filter)
        .sort({
          [normalizedSortBy]:
            normalizedSortOrder,
        })
        .skip(skip)
        .limit(currentLimit)
        .lean(),

      Risk.countDocuments(
        filter
      ),
    ]);

    const riskIds =
      risks.map(
        (risk) => risk._id
      );

    const evidenceSummaryMap =
      await getEvidenceSummaryMap(
        riskIds
      );

    const risksWithEvidence =
      risks.map((risk) => {
        const evidenceSummary =
          evidenceSummaryMap.get(
            risk._id.toString()
          ) ||
          getEmptyEvidenceSummary();

        return {
          ...risk,

          evidenceSummary,
        };
      });

    const totalPages =
      Math.max(
        Math.ceil(
          totalRecords /
            currentLimit
        ),
        1
      );

    return {
      risks:
        risksWithEvidence,

      pagination: {
        page:
          currentPage,

        limit:
          currentLimit,

        /*
          Frontend RiskPagination.total use karta hai.
          totalRecords compatibility ke liye bhi rakha hai.
        */
        total:
          totalRecords,

        totalRecords,

        totalPages,

        hasNextPage:
          currentPage <
          totalPages,

        hasPreviousPage:
          currentPage > 1,
      },
    };
  };

/* =========================================================
   GET SINGLE RISK
   ========================================================= */

export const getRiskByIdService =
  async (riskId) => {
    validateMongoId(
      riskId,
      "Risk ID"
    );

    const risk =
      await Risk.findById(
        riskId
      ).lean();

    if (!risk) {
      throw createServiceError(
        404,
        "Risk not found."
      );
    }

    const evidence =
      await getRiskEvidence(
        riskId
      );

    return {
      risk,
      evidence,
    };
  };

/* =========================================================
   UPDATE RISK
   ========================================================= */

export const updateRiskService =
  async (
    riskId,
    {
      projectId,
      serialNo,
      riskRegisterId,
      description,
    }
  ) => {
    try {
      validateMongoId(
        riskId,
        "Risk ID"
      );

      const risk =
        await Risk.findById(
          riskId
        );

      if (!risk) {
        throw createServiceError(
          404,
          "Risk not found."
        );
      }

      const project =
        await fetchProjectDetails(
          projectId
        );

      risk.projectId =
        project.projectId;

      risk.projectCode =
        project.projectCode;

      risk.serialNo =
        normalizeText(
          serialNo
        );

      risk.riskRegisterId =
        normalizeText(
          riskRegisterId
        ).toUpperCase();

      risk.description =
        normalizeText(
          description
        );

      await risk.save();

      const evidenceCollection =
        getEvidenceCollection();

      await evidenceCollection.updateMany(
        {
          riskId: risk._id,
        },
        {
          $set: {
            projectId:
              project.projectId,

            projectCode:
              project.projectCode,

            riskRegisterId:
              risk.riskRegisterId,

            updatedAt:
              new Date(),
          },
        }
      );

      const evidence =
        await getRiskEvidence(
          riskId
        );

      return {
        risk,
        evidence,
      };
    } catch (error) {
      handleDuplicateRiskError(
        error
      );
    }
  };

/* =========================================================
   UPDATE RISK STATUS
   ========================================================= */

export const updateRiskStatusService =
  async (
    riskId,
    requestedStatus
  ) => {
    validateMongoId(
      riskId,
      "Risk ID"
    );

    const status =
      normalizeRiskStatus(
        requestedStatus
      );

    const risk =
      await Risk.findById(
        riskId
      );

    if (!risk) {
      throw createServiceError(
        404,
        "Risk not found."
      );
    }

    const evidence =
      await getRiskEvidence(
        riskId
      );

    if (
      status === "complete" &&
      !evidence.canMarkComplete
    ) {
      throw createServiceError(
        400,
        "Risk cannot be marked Complete until at least one Before image and one After image are uploaded."
      );
    }

    risk.status = status;

    await risk.save();

    return {
      risk,
      evidence,
    };
  };

/* =========================================================
   SYNC STATUS AFTER EVIDENCE DELETE
   ========================================================= */

export const syncRiskStatusWithEvidence =
  async (riskId) => {
    validateMongoId(
      riskId,
      "Risk ID"
    );

    const risk =
      await Risk.findById(
        riskId
      );

    if (!risk) {
      throw createServiceError(
        404,
        "Risk not found."
      );
    }

    const evidence =
      await getRiskEvidence(
        riskId
      );

    if (
      risk.status ===
        "complete" &&
      !evidence.canMarkComplete
    ) {
      risk.status =
        "in_progress";

      await risk.save();
    }

    return {
      risk,
      evidence,
    };
  };

/* =========================================================
   DELETE RISK
   ========================================================= */

export const deleteRiskService =
  async (riskId) => {
    validateMongoId(
      riskId,
      "Risk ID"
    );

    const risk =
      await Risk.findById(
        riskId
      );

    if (!risk) {
      throw createServiceError(
        404,
        "Risk not found."
      );
    }

    const evidenceCollection =
      getEvidenceCollection();

    const evidenceRecords =
      await evidenceCollection
        .find({
          riskId: risk._id,
        })
        .toArray();

    const imagePaths =
      evidenceRecords
        .map(
          (record) =>
            record.imagePath
        )
        .filter(
          (imagePath) =>
            typeof imagePath ===
              "string" &&
            imagePath.trim()
        );

    const deletedRisk = {
      _id: risk._id,

      projectId:
        risk.projectId,

      projectCode:
        risk.projectCode,

      serialNo:
        risk.serialNo,

      riskRegisterId:
        risk.riskRegisterId,

      description:
        risk.description,

      status:
        risk.status,

      createdAt:
        risk.createdAt,

      updatedAt:
        risk.updatedAt,
    };

    const evidenceDeleteResult =
      await evidenceCollection.deleteMany(
        {
          riskId: risk._id,
        }
      );

    await risk.deleteOne();

    return {
      risk: deletedRisk,

      deletedEvidenceCount:
        evidenceDeleteResult.deletedCount ??
        0,

      imagePaths,
    };
  };