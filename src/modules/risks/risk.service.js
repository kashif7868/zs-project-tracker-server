import mongoose from "mongoose";

import Risk, {
  RiskSerialCounter,
} from "../../models/risks/risk.model.js";

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

const SERIAL_CREATION_RETRY_LIMIT = 25;

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

const hasOwnField = (
  object,
  field
) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    field
  );
};

const validateMongoId = (
  value,
  fieldName
) => {
  if (
    !mongoose.isValidObjectId(
      value
    )
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
   DUPLICATE HELPERS
   ========================================================= */

const getDuplicateFields = (
  error
) => {
  if (
    error?.code !== 11000
  ) {
    return [];
  }

  return Object.keys(
    error.keyPattern ||
      error.keyValue ||
      {}
  );
};

const isDuplicateField = (
  error,
  field
) => {
  return getDuplicateFields(
    error
  ).includes(field);
};

const handleDuplicateRiskError = (
  error
) => {
  if (
    error?.code !== 11000
  ) {
    throw error;
  }

  const duplicateFields =
    getDuplicateFields(
      error
    );

  if (
    duplicateFields.includes(
      "serialNo"
    )
  ) {
    throw createServiceError(
      409,
      "Risk serial number allocation conflict occurred. Please try again."
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
        [
          "_id",
          "projectCode",
          "code",
          "settings.riskRegisterIdEnabled",
        ].join(" ")
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
      "Selected project does not have a Project Reference Number."
    );
  }

  return {
    projectId:
      project._id,

    projectCode,

    riskRegisterIdEnabled:
      project.settings
        ?.riskRegisterIdEnabled ===
      true,
  };
};

/* =========================================================
   RISK REGISTER ID CONTROL

   Disabled:

   - New Risk Register ID cannot be supplied.
   - Existing saved value remains preserved.
   - Existing value cannot be changed or removed.

   Enabled:

   - Field is available.
   - Field remains optional.
   ========================================================= */

const validateRiskRegisterIdSetting = ({
  project,
  fieldProvided,
  riskRegisterId,
}) => {
  if (!fieldProvided) {
    return;
  }

  if (
    !project
      .riskRegisterIdEnabled
  ) {
    throw createServiceError(
      400,
      "Risk Register ID is disabled for this project."
    );
  }

  const normalizedValue =
    normalizeText(
      riskRegisterId
    );

  if (
    normalizedValue.length >
    100
  ) {
    throw createServiceError(
      400,
      "Risk Register ID cannot exceed 100 characters."
    );
  }
};

/* =========================================================
   SERIAL COUNTER SYNCHRONIZATION

   Existing serialNo values Number ya old String format mein
   ho sakti hain.

   Example:

   "001"
   "25"
   120

   Aggregation un values ko integer mein convert karke project
   ka maximum serial calculate karegi.

   Counter kabhi peeche nahi jayega because $max use ho raha hai.
   ========================================================= */

const synchronizeRiskSerialCounter =
  async (projectId) => {
    validateMongoId(
      projectId,
      "Project ID"
    );

    const projectObjectId =
      new mongoose.Types.ObjectId(
        projectId
      );

    const maximumSerialResult =
      await Risk.collection
        .aggregate([
          {
            $match: {
              projectId:
                projectObjectId,
            },
          },
          {
            $project: {
              convertedSerial: {
                $convert: {
                  input:
                    "$serialNo",

                  to:
                    "int",

                  onError:
                    null,

                  onNull:
                    null,
                },
              },
            },
          },
          {
            $match: {
              convertedSerial: {
                $ne: null,
              },
            },
          },
          {
            $group: {
              _id: null,

              maximumSerial: {
                $max:
                  "$convertedSerial",
              },
            },
          },
        ])
        .toArray();

    const maximumSerial =
      Number(
        maximumSerialResult[0]
          ?.maximumSerial ||
          0
      );

    if (
      !Number.isInteger(
        maximumSerial
      ) ||
      maximumSerial < 1
    ) {
      return;
    }

    await RiskSerialCounter.updateOne(
      {
        projectId:
          projectObjectId,
      },
      {
        $max: {
          sequence:
            maximumSerial,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
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
              riskId:
                riskObjectId,
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

    summary.forEach(
      (item) => {
        if (
          item._id ===
          "before"
        ) {
          evidenceSummary.beforeCount =
            item.count;
        }

        if (
          item._id ===
          "after"
        ) {
          evidenceSummary.afterCount =
            item.count;
        }
      }
    );

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
    !Array.isArray(
      riskIds
    ) ||
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
              $in:
                riskIds,
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

  summary.forEach(
    (item) => {
      const riskId =
        item._id.riskId.toString();

      const currentSummary =
        summaryMap.get(
          riskId
        ) ||
        getEmptyEvidenceSummary();

      if (
        item._id
          .evidenceType ===
        "before"
      ) {
        currentSummary.beforeCount =
          item.count;
      }

      if (
        item._id
          .evidenceType ===
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
    }
  );

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
          before.push(
            record
          );
        }

        if (
          record.evidenceType ===
          "after"
        ) {
          after.push(
            record
          );
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

   Allowed:

   projectId
   description
   riskRegisterId optional

   serialNo automatically generated.
   status automatically in_progress.
   ========================================================= */

export const createRiskService =
  async (payload = {}) => {
    const {
      projectId,
      riskRegisterId,
      description,
    } = payload;

    if (
      hasOwnField(
        payload,
        "serialNo"
      )
    ) {
      throw createServiceError(
        400,
        "Serial number is generated automatically and cannot be supplied."
      );
    }

    if (
      hasOwnField(
        payload,
        "status"
      )
    ) {
      throw createServiceError(
        400,
        "New risks always start with in_progress status."
      );
    }

    const project =
      await fetchProjectDetails(
        projectId
      );

    const riskRegisterIdProvided =
      hasOwnField(
        payload,
        "riskRegisterId"
      ) &&
      Boolean(
        normalizeText(
          riskRegisterId
        )
      );

    validateRiskRegisterIdSetting({
      project,

      fieldProvided:
        riskRegisterIdProvided,

      riskRegisterId,
    });

    const normalizedDescription =
      normalizeText(
        description
      );

    if (
      normalizedDescription.length <
      3
    ) {
      throw createServiceError(
        400,
        "Description must contain at least 3 characters."
      );
    }

    if (
      normalizedDescription.length >
      3000
    ) {
      throw createServiceError(
        400,
        "Description cannot exceed 3000 characters."
      );
    }

    await synchronizeRiskSerialCounter(
      project.projectId
    );

    for (
      let attempt = 1;
      attempt <=
      SERIAL_CREATION_RETRY_LIMIT;
      attempt += 1
    ) {
      try {
        const risk =
          await Risk.create({
            projectId:
              project.projectId,

            projectCode:
              project.projectCode,

            ...(riskRegisterIdProvided
              ? {
                  riskRegisterId:
                    normalizeText(
                      riskRegisterId
                    ).toUpperCase(),
                }
              : {}),

            description:
              normalizedDescription,

            status:
              "in_progress",
          });

        return {
          risk,

          evidence:
            getEmptyEvidenceSummary(),
        };
      } catch (error) {
        const serialConflict =
          isDuplicateField(
            error,
            "serialNo"
          );

        if (
          serialConflict &&
          attempt <
            SERIAL_CREATION_RETRY_LIMIT
        ) {
          await synchronizeRiskSerialCounter(
            project.projectId
          );

          continue;
        }

        handleDuplicateRiskError(
          error
        );
      }
    }

    throw createServiceError(
      409,
      "Risk serial number could not be allocated. Please try again."
    );
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

    if (
      normalizedProjectId
    ) {
      validateMongoId(
        normalizedProjectId,
        "Project ID"
      );

      filter.projectId =
        new mongoose.Types.ObjectId(
          normalizedProjectId
        );
    }

    if (
      normalizedStatus
    ) {
      filter.status =
        normalizeRiskStatus(
          normalizedStatus
        );
    }

    if (
      normalizedSearch
    ) {
      const safeSearch =
        escapeRegex(
          normalizedSearch
        );

      const searchConditions = [
        {
          riskRegisterId: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },
        {
          projectCode: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },
        {
          description: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },
      ];

      if (
        /^\d+$/.test(
          normalizedSearch
        )
      ) {
        searchConditions.unshift({
          serialNo:
            Number(
              normalizedSearch
            ),
        });
      }

      filter.$or =
        searchConditions;
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
    ] =
      await Promise.all([
        Risk.find(filter)
          .sort({
            [normalizedSortBy]:
              normalizedSortOrder,

            _id:
              normalizedSortOrder,
          })
          .skip(skip)
          .limit(
            currentLimit
          )
          .lean(),

        Risk.countDocuments(
          filter
        ),
      ]);

    const riskIds =
      risks.map(
        (risk) =>
          risk._id
      );

    const evidenceSummaryMap =
      await getEvidenceSummaryMap(
        riskIds
      );

    const risksWithEvidence =
      risks.map(
        (risk) => {
          const evidenceSummary =
            evidenceSummaryMap.get(
              risk._id.toString()
            ) ||
            getEmptyEvidenceSummary();

          return {
            ...risk,
            evidenceSummary,
          };
        }
      );

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

   Editable:

   description
   riskRegisterId optional

   Protected:

   projectId
   projectCode
   serialNo
   status
   ========================================================= */

export const updateRiskService =
  async (
    riskId,
    updateData = {}
  ) => {
    try {
      validateMongoId(
        riskId,
        "Risk ID"
      );

      const protectedFields = [
        "projectId",
        "projectCode",
        "serialNo",
        "status",
      ];

      const receivedProtectedField =
        protectedFields.find(
          (field) =>
            hasOwnField(
              updateData,
              field
            )
        );

      if (
        receivedProtectedField
      ) {
        const messages = {
          projectId:
            "A risk cannot be moved to another project.",

          projectCode:
            "Project Reference Number cannot be changed from the risk update endpoint.",

          serialNo:
            "Serial number is generated automatically and cannot be updated.",

          status:
            "Use the dedicated risk status endpoint to update status.",
        };

        throw createServiceError(
          400,
          messages[
            receivedProtectedField
          ]
        );
      }

      const allowedFields = [
        "riskRegisterId",
        "description",
      ];

      const receivedFields =
        Object.keys(
          updateData
        );

      const invalidField =
        receivedFields.find(
          (field) =>
            !allowedFields.includes(
              field
            )
        );

      if (invalidField) {
        throw createServiceError(
          400,
          `${invalidField} is not allowed while updating a risk.`
        );
      }

      if (
        receivedFields.length ===
        0
      ) {
        throw createServiceError(
          400,
          "At least one risk field is required."
        );
      }

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
          risk.projectId.toString()
        );

      if (
        hasOwnField(
          updateData,
          "riskRegisterId"
        )
      ) {
        validateRiskRegisterIdSetting({
          project,

          fieldProvided: true,

          riskRegisterId:
            updateData
              .riskRegisterId,
        });

        const normalizedRiskRegisterId =
          normalizeText(
            updateData
              .riskRegisterId
          );

        risk.riskRegisterId =
          normalizedRiskRegisterId
            ? normalizedRiskRegisterId.toUpperCase()
            : undefined;
      }

      if (
        hasOwnField(
          updateData,
          "description"
        )
      ) {
        const normalizedDescription =
          normalizeText(
            updateData.description
          );

        if (
          normalizedDescription.length <
          3
        ) {
          throw createServiceError(
            400,
            "Description must contain at least 3 characters."
          );
        }

        if (
          normalizedDescription.length >
          3000
        ) {
          throw createServiceError(
            400,
            "Description cannot exceed 3000 characters."
          );
        }

        risk.description =
          normalizedDescription;
      }

      /*
        Project transfer allowed nahi.

        Stored project reference ko current Project record ke
        reference ke saath synchronize kiya ja raha hai.
      */

      risk.projectId =
        project.projectId;

      risk.projectCode =
        project.projectCode;

      await risk.save();

      const evidenceCollection =
        getEvidenceCollection();

      const evidenceUpdate = {
        $set: {
          projectId:
            project.projectId,

          projectCode:
            project.projectCode,

          updatedAt:
            new Date(),
        },
      };

      if (
        risk.riskRegisterId
      ) {
        evidenceUpdate.$set.riskRegisterId =
          risk.riskRegisterId;
      } else {
        evidenceUpdate.$unset = {
          riskRegisterId: "",
        };
      }

      await evidenceCollection.updateMany(
        {
          riskId:
            risk._id,
        },
        evidenceUpdate
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

    risk.status =
      status;

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
          riskId:
            risk._id,
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
      _id:
        risk._id,

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
          riskId:
            risk._id,
        }
      );

    await risk.deleteOne();

    return {
      risk:
        deletedRisk,

      deletedEvidenceCount:
        evidenceDeleteResult
          .deletedCount ??
        0,

      imagePaths,
    };
  };