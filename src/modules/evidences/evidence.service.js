import mongoose from "mongoose";

import Evidence from "../../models/evidences/evidence.model.js";
import Risk from "../../models/risks/risk.model.js";

import {
  syncRiskStatusWithEvidence,
} from "../risks/risk.service.js";

/* =========================================================
   CONSTANTS
   ========================================================= */

const EVIDENCE_TYPES = [
  "before",
  "after",
];

const MAX_EVIDENCE_IMAGES = 10;

const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  statusCode,
  message
) => {
  const error = new Error(message);

  error.statusCode =
    statusCode;

  error.status =
    statusCode;

  return error;
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const normalizeText = (
  value
) => {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
};

const validateMongoId = (
  value,
  fieldName
) => {
  const normalizedValue =
    normalizeText(
      value
    );

  if (
    !mongoose.isValidObjectId(
      normalizedValue
    )
  ) {
    throw createServiceError(
      400,
      `${fieldName} is invalid.`
    );
  }

  return normalizedValue;
};

const normalizeEvidenceType = (
  value
) => {
  const evidenceType =
    normalizeText(
      value
    ).toLowerCase();

  if (
    !EVIDENCE_TYPES.includes(
      evidenceType
    )
  ) {
    throw createServiceError(
      400,
      "Evidence type must be before or after."
    );
  }

  return evidenceType;
};

const toPlainObject = (
  value
) => {
  if (
    value &&
    typeof value.toObject ===
      "function"
  ) {
    return value.toObject();
  }

  return value;
};

const getOptionalRiskRegisterId = (
  value
) => {
  const riskRegisterId =
    normalizeText(
      value
    ).toUpperCase();

  return (
    riskRegisterId ||
    undefined
  );
};

/* =========================================================
   IMAGE PATH VALIDATION
   ========================================================= */

const normalizeImagePath = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    throw createServiceError(
      400,
      "Evidence image path is invalid."
    );
  }

  let imagePath =
    value
      .trim()
      .replaceAll(
        "\\",
        "/"
      );

  if (!imagePath) {
    throw createServiceError(
      400,
      "Evidence image path is required."
    );
  }

  if (
    !imagePath.startsWith(
      "/"
    )
  ) {
    imagePath =
      `/${imagePath}`;
  }

  if (
    imagePath.includes(
      ".."
    )
  ) {
    throw createServiceError(
      400,
      "Evidence image path is invalid."
    );
  }

  const lowerCasePath =
    imagePath.toLowerCase();

  const hasAllowedExtension =
    ALLOWED_IMAGE_EXTENSIONS.some(
      (extension) =>
        lowerCasePath.endsWith(
          extension
        )
    );

  if (
    !hasAllowedExtension
  ) {
    throw createServiceError(
      400,
      "Only JPG, JPEG, PNG and WEBP Evidence images are allowed."
    );
  }

  return imagePath;
};

const normalizeImagePaths = (
  imagePaths
) => {
  if (
    !Array.isArray(
      imagePaths
    )
  ) {
    throw createServiceError(
      400,
      "Evidence images must be provided as an array."
    );
  }

  const normalizedPaths = [
    ...new Set(
      imagePaths.map(
        normalizeImagePath
      )
    ),
  ];

  if (
    normalizedPaths.length ===
    0
  ) {
    throw createServiceError(
      400,
      "At least one Evidence image is required."
    );
  }

  if (
    normalizedPaths.length >
    MAX_EVIDENCE_IMAGES
  ) {
    throw createServiceError(
      400,
      `Maximum ${MAX_EVIDENCE_IMAGES} Evidence images can be uploaded at one time.`
    );
  }

  return normalizedPaths;
};

/* =========================================================
   RISK HELPER
   ========================================================= */

const getRiskRecord = async (
  riskId
) => {
  const normalizedRiskId =
    validateMongoId(
      riskId,
      "Risk ID"
    );

  const risk =
    await Risk.findById(
      normalizedRiskId
    ).lean();

  if (!risk) {
    throw createServiceError(
      404,
      "Risk not found."
    );
  }

  return risk;
};

const buildRiskResponse = (
  risk
) => {
  const riskRegisterId =
    getOptionalRiskRegisterId(
      risk.riskRegisterId
    );

  return {
    _id:
      risk._id,

    projectId:
      risk.projectId,

    projectCode:
      risk.projectCode,

    serialNo:
      risk.serialNo,

    ...(riskRegisterId
      ? {
          riskRegisterId,
        }
      : {}),

    description:
      risk.description,

    status:
      risk.status,

    createdAt:
      risk.createdAt,

    updatedAt:
      risk.updatedAt,
  };
};

/* =========================================================
   EVIDENCE SUMMARY HELPER
   ========================================================= */

const buildEvidenceResponse = (
  evidenceRecords
) => {
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
   GET ALL EVIDENCE FOR ONE RISK
   ========================================================= */

export const getRiskEvidencesService =
  async (
    riskId
  ) => {
    const risk =
      await getRiskRecord(
        riskId
      );

    const evidenceRecords =
      await Evidence.find({
        riskId:
          risk._id,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    return buildEvidenceResponse(
      evidenceRecords
    );
  };

/* =========================================================
   GET EVIDENCE BY TYPE
   ========================================================= */

export const getEvidenceByTypeService =
  async (
    riskId,
    requestedEvidenceType
  ) => {
    const risk =
      await getRiskRecord(
        riskId
      );

    const evidenceType =
      normalizeEvidenceType(
        requestedEvidenceType
      );

    const evidences =
      await Evidence.find({
        riskId:
          risk._id,

        evidenceType,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    return {
      evidenceType,

      evidences,

      count:
        evidences.length,
    };
  };

/* =========================================================
   ADD EVIDENCE IMAGES

   Maximum limit per Risk:

   10 Before images
   10 After images

   Evidence upload Risk ko automatically Complete nahi karega.

   User manually Mark Complete use karega after at least:

   - one Before image
   - one After image
   ========================================================= */

export const addEvidenceImagesService =
  async ({
    riskId,

    evidenceType:
      requestedEvidenceType,

    imagePaths,
  }) => {
    const risk =
      await getRiskRecord(
        riskId
      );

    const evidenceType =
      normalizeEvidenceType(
        requestedEvidenceType
      );

    const normalizedImagePaths =
      normalizeImagePaths(
        imagePaths
      );

    const expectedFolder =
      `/uploads/risks/${evidenceType}/`;

    const invalidFolderPaths =
      normalizedImagePaths.filter(
        (imagePath) =>
          !imagePath.startsWith(
            expectedFolder
          )
      );

    if (
      invalidFolderPaths.length >
      0
    ) {
      throw createServiceError(
        400,
        `${evidenceType} Evidence images must be stored inside ${expectedFolder}`
      );
    }

    const [
      existingEvidence,
      currentEvidenceCount,
    ] =
      await Promise.all([
        Evidence.find({
          riskId:
            risk._id,

          evidenceType,

          imagePath: {
            $in:
              normalizedImagePaths,
          },
        })
          .select(
            "imagePath"
          )
          .lean(),

        Evidence.countDocuments({
          riskId:
            risk._id,

          evidenceType,
        }),
      ]);

    const existingImagePaths =
      new Set(
        existingEvidence.map(
          (record) =>
            record.imagePath
        )
      );

    const newImagePaths =
      normalizedImagePaths.filter(
        (imagePath) =>
          !existingImagePaths.has(
            imagePath
          )
      );

    if (
      newImagePaths.length ===
      0
    ) {
      throw createServiceError(
        409,
        "These Evidence images are already attached to this Risk."
      );
    }

    if (
      currentEvidenceCount +
        newImagePaths.length >
      MAX_EVIDENCE_IMAGES
    ) {
      const remainingSlots =
        Math.max(
          MAX_EVIDENCE_IMAGES -
            currentEvidenceCount,
          0
        );

      throw createServiceError(
        400,
        `Maximum ${MAX_EVIDENCE_IMAGES} ${evidenceType} Evidence images are allowed per Risk. ${remainingSlots} upload slot${remainingSlots === 1 ? "" : "s"} remaining.`
      );
    }

    const riskRegisterId =
      getOptionalRiskRegisterId(
        risk.riskRegisterId
      );

    const evidenceDocuments =
      newImagePaths.map(
        (imagePath) => ({
          projectId:
            risk.projectId,

          projectCode:
            risk.projectCode,

          riskId:
            risk._id,

          ...(riskRegisterId
            ? {
                riskRegisterId,
              }
            : {}),

          evidenceType,

          imagePath,
        })
      );

    let createdEvidence = [];

    try {
      const createdDocuments =
        await Evidence.insertMany(
          evidenceDocuments,
          {
            ordered: true,
          }
        );

      createdEvidence =
        createdDocuments.map(
          toPlainObject
        );
    } catch (error) {
      /*
        insertMany partial success de sakta hai.

        Current upload ke new image records rollback honge.
        Controller related physical files cleanup karega.
      */

      await Evidence.deleteMany({
        riskId:
          risk._id,

        evidenceType,

        imagePath: {
          $in:
            newImagePaths,
        },
      });

      if (
        error?.code ===
        11000
      ) {
        throw createServiceError(
          409,
          "One or more Evidence images already exist."
        );
      }

      throw error;
    }

    const evidence =
      await getRiskEvidencesService(
        risk._id.toString()
      );

    return {
      risk:
        buildRiskResponse(
          risk
        ),

      uploadedEvidence:
        createdEvidence,

      evidence,
    };
  };

/* =========================================================
   ADD BEFORE EVIDENCE
   ========================================================= */

export const addBeforeEvidenceService =
  async (
    riskId,
    imagePaths
  ) => {
    return addEvidenceImagesService({
      riskId,

      evidenceType:
        "before",

      imagePaths,
    });
  };

/* =========================================================
   ADD AFTER EVIDENCE
   ========================================================= */

export const addAfterEvidenceService =
  async (
    riskId,
    imagePaths
  ) => {
    return addEvidenceImagesService({
      riskId,

      evidenceType:
        "after",

      imagePaths,
    });
  };

/* =========================================================
   GET SINGLE EVIDENCE
   ========================================================= */

export const getEvidenceByIdService =
  async (
    evidenceId
  ) => {
    const normalizedEvidenceId =
      validateMongoId(
        evidenceId,
        "Evidence ID"
      );

    const evidence =
      await Evidence.findById(
        normalizedEvidenceId
      ).lean();

    if (!evidence) {
      throw createServiceError(
        404,
        "Evidence image was not found."
      );
    }

    return evidence;
  };

/* =========================================================
   DELETE SINGLE EVIDENCE

   Database record is deleted here.

   Physical image file is deleted by controller.

   Required Evidence removal from a completed Risk moves the
   Risk back to In Progress.
   ========================================================= */

export const deleteEvidenceService =
  async (
    riskId,
    evidenceId
  ) => {
    const risk =
      await getRiskRecord(
        riskId
      );

    const normalizedEvidenceId =
      validateMongoId(
        evidenceId,
        "Evidence ID"
      );

    const evidence =
      await Evidence.findOne({
        _id:
          normalizedEvidenceId,

        riskId:
          risk._id,
      });

    if (!evidence) {
      throw createServiceError(
        404,
        "Evidence image was not found for this Risk."
      );
    }

    const riskRegisterId =
      getOptionalRiskRegisterId(
        evidence.riskRegisterId
      );

    const deletedEvidence = {
      _id:
        evidence._id,

      projectId:
        evidence.projectId,

      projectCode:
        evidence.projectCode,

      riskId:
        evidence.riskId,

      ...(riskRegisterId
        ? {
            riskRegisterId,
          }
        : {}),

      evidenceType:
        evidence.evidenceType,

      imagePath:
        evidence.imagePath,

      createdAt:
        evidence.createdAt,

      updatedAt:
        evidence.updatedAt,
    };

    await evidence.deleteOne();

    const syncedRisk =
      await syncRiskStatusWithEvidence(
        risk._id.toString()
      );

    return {
      evidence:
        deletedEvidence,

      imagePath:
        deletedEvidence.imagePath,

      risk:
        syncedRisk.risk,

      evidenceSummary:
        syncedRisk.evidence,
    };
  };

/* =========================================================
   DELETE ALL EVIDENCE OF ONE TYPE
   ========================================================= */

export const deleteEvidenceTypeService =
  async (
    riskId,
    requestedEvidenceType
  ) => {
    const risk =
      await getRiskRecord(
        riskId
      );

    const evidenceType =
      normalizeEvidenceType(
        requestedEvidenceType
      );

    const evidenceRecords =
      await Evidence.find({
        riskId:
          risk._id,

        evidenceType,
      })
        .select(
          "imagePath"
        )
        .lean();

    if (
      evidenceRecords.length ===
      0
    ) {
      throw createServiceError(
        404,
        `No ${evidenceType} Evidence images were found.`
      );
    }

    const imagePaths = [
      ...new Set(
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
          )
      ),
    ];

    const deleteResult =
      await Evidence.deleteMany({
        riskId:
          risk._id,

        evidenceType,
      });

    const syncedRisk =
      await syncRiskStatusWithEvidence(
        risk._id.toString()
      );

    return {
      evidenceType,

      deletedRecords:
        deleteResult.deletedCount ??
        0,

      imagePaths,

      risk:
        syncedRisk.risk,

      evidenceSummary:
        syncedRisk.evidence,
    };
  };