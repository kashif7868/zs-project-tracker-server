import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";

import ProjectDocument, {
  DOCUMENT_MIME_TYPES,
} from "../../models/documents/document.model.js";

import Project from "../../models/project/project.model.js";
import Task from "../../models/task_register/task.model.js";
import Evidence from "../../models/evidences/evidence.model.js";

import {
  syncProjectDerivedMetrics,
} from "../projects/project.service.js";

/* =========================================================
   DIRECTORY PATHS

   Current file:

   backend/src/modules/documents/document.service.js

   Generated files:

   backend/public/uploads/documents/PROJECT_ID/
   ========================================================= */

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  path.dirname(currentFilePath);

const backendDirectory =
  path.resolve(
    currentDirectory,
    "../../../"
  );

const publicDirectory =
  path.resolve(
    backendDirectory,
    "public"
  );

const documentsDirectory =
  path.resolve(
    publicDirectory,
    "uploads",
    "documents"
  );

/* =========================================================
   CONSTANTS
   ========================================================= */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const DOCUMENT_LAYOUTS = [
  "task_register",
  "detailed_evidence",
  "summary",
];

const DOCUMENT_FORMATS = [
  "pdf",
  "docx",
  "xlsx",
];

const DOCUMENT_STATUSES = [
  "generating",
  "completed",
  "failed",
];

const TASK_STATUSES = [
  "in_progress",
  "complete",
];

const SORT_ORDERS = [
  "asc",
  "desc",
];

const TASK_SORT_FIELDS = [
  "serialNo",
  "createdAt",
  "updatedAt",
  "status",
];

const DOCUMENT_SORT_FIELDS = [
  "createdAt",
  "generatedAt",
  "title",
  "status",
  "format",
  "layout",
];

const SUPPORTED_IMAGE_EXTENSIONS = [
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

  error.statusCode = statusCode;
  error.status = statusCode;

  return error;
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const normalizeText = (
  value
) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const normalizeLowercaseText = (
  value
) => {
  return normalizeText(
    value
  ).toLowerCase();
};

const normalizeBoolean = (
  value,
  fallback
) => {
  return typeof value === "boolean"
    ? value
    : fallback;
};

const normalizePositiveInteger = (
  value,
  fallback,
  maximum
) => {
  const parsedValue =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isInteger(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    return fallback;
  }

  return Math.min(
    parsedValue,
    maximum
  );
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

const escapeRegex = (
  value
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
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

const uniqueMongoIds = (
  values
) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) =>
          normalizeText(
            String(value)
          )
        )
        .filter((value) =>
          mongoose.isValidObjectId(
            value
          )
        )
    ),
  ];
};

/* =========================================================
   PROJECT HELPERS
   ========================================================= */

const getProjectReference = (
  project
) => {
  return (
    normalizeText(
      project?.projectCode
    ) ||
    normalizeText(
      project?.projectReferenceNo
    )
  ).toUpperCase();
};

const getProjectTitle = (
  project
) => {
  return (
    normalizeText(
      project?.title
    ) ||
    normalizeText(
      project?.projectName
    ) ||
    normalizeText(
      project?.name
    ) ||
    normalizeText(
      project?.siteName
    ) ||
    getProjectReference(
      project
    ) ||
    "Untitled Project"
  );
};

const getProjectRecord = async (
  projectId
) => {
  const normalizedProjectId =
    validateMongoId(
      projectId,
      "Project ID"
    );

  const project =
    await Project.findById(
      normalizedProjectId
    ).lean();

  if (!project) {
    throw createServiceError(
      404,
      "Project not found."
    );
  }

  const projectCode =
    getProjectReference(
      project
    );

  if (!projectCode) {
    throw createServiceError(
      409,
      "Project Reference Number is missing."
    );
  }

  return {
    project,

    projectCode,

    projectTitle:
      getProjectTitle(
        project
      ),
  };
};


/* =========================================================
   PROJECT REPORT DETAILS

   Report generators ke liye normalized, user-friendly
   Project information return karta hai.
   ========================================================= */

const buildProjectReportDetails = (
  project
) => {
  return {
    clientName:
      normalizeText(
        project?.client?.name
      ),

    clientCompany:
      normalizeText(
        project?.client?.company
      ),

    siteName:
      normalizeText(
        project?.site?.name
      ),

    siteLocation:
      normalizeText(
        project?.site?.location
      ),

    city:
      normalizeText(
        project?.site?.city
      ),

    country:
      normalizeText(
        project?.site?.country
      ),

    systemCapacityKW:
      Number(
        project
          ?.systemCapacityKW ||
          0
      ),

    auditDate:
      project?.auditDate,

    startDate:
      project?.startDate,

    expectedCompletionDate:
      project
        ?.expectedCompletionDate,

    actualCompletionDate:
      project
        ?.actualCompletionDate,

    status:
      normalizeText(
        project?.status
      ),

    overallRiskLevel:
      normalizeText(
        project
          ?.overallRiskLevel
      ),

    progress: {
      overall:
        Number(
          project
            ?.progressBreakdown
            ?.overall ??
          project
            ?.progress
            ?.overall ??
          0
        ),

      rectification:
        Number(
          project
            ?.progressBreakdown
            ?.rectification ??
          project
            ?.progress
            ?.rectification ??
          0
        ),

      evidence:
        Number(
          project
            ?.progressBreakdown
            ?.evidence ??
          project
            ?.progress
            ?.evidence ??
          0
        ),

      testing:
        Number(
          project
            ?.progressBreakdown
            ?.testing ??
          project
            ?.progress
            ?.testing ??
          0
        ),

      actionPlan:
        Number(
          project
            ?.progressBreakdown
            ?.actionPlan ??
          project
            ?.progress
            ?.actionPlan ??
          0
        ),
    },
  };
};

/* =========================================================
   GENERATED BY USER
   ========================================================= */

const normalizeGeneratedBy = (
  generatedBy
) => {
  const possibleUserId =
    generatedBy?._id ||
    generatedBy?.id ||
    generatedBy;

  return validateMongoId(
    String(
      possibleUserId || ""
    ),
    "Generated By user ID"
  );
};

/* =========================================================
   DOCUMENT FILTER NORMALIZER
   ========================================================= */

const normalizeDocumentFilters = (
  filters = {}
) => {
  const requestedStatus =
    normalizeLowercaseText(
      filters.statusFilter
    );

  const statusFilter = [
    "all",
    ...TASK_STATUSES,
  ].includes(requestedStatus)
    ? requestedStatus
    : "all";

  const requestedSortBy =
    normalizeText(
      filters.sortBy
    );

  const sortBy =
    TASK_SORT_FIELDS.includes(
      requestedSortBy
    )
      ? requestedSortBy
      : "serialNo";

  const requestedSortOrder =
    normalizeLowercaseText(
      filters.sortOrder
    );

  const sortOrder =
    SORT_ORDERS.includes(
      requestedSortOrder
    )
      ? requestedSortOrder
      : "asc";

  const dateFrom =
    filters.dateFrom
      ? new Date(
          filters.dateFrom
        )
      : undefined;

  const dateTo =
    filters.dateTo
      ? new Date(
          filters.dateTo
        )
      : undefined;

  if (
    dateFrom &&
    Number.isNaN(
      dateFrom.getTime()
    )
  ) {
    throw createServiceError(
      400,
      "Date From is invalid."
    );
  }

  if (
    dateTo &&
    Number.isNaN(
      dateTo.getTime()
    )
  ) {
    throw createServiceError(
      400,
      "Date To is invalid."
    );
  }

  if (
    dateFrom &&
    dateTo &&
    dateTo < dateFrom
  ) {
    throw createServiceError(
      400,
      "Date To must be equal to or later than Date From."
    );
  }

  if (dateFrom) {
    dateFrom.setHours(
      0,
      0,
      0,
      0
    );
  }

  if (dateTo) {
    dateTo.setHours(
      23,
      59,
      59,
      999
    );
  }

  return {
    statusFilter,

    includeProjectDetails:
      normalizeBoolean(
        filters.includeProjectDetails,
        true
      ),

    includeBeforeEvidence:
      normalizeBoolean(
        filters.includeBeforeEvidence,
        true
      ),

    includeAfterEvidence:
      normalizeBoolean(
        filters.includeAfterEvidence,
        true
      ),

    includeEvidenceImages:
      normalizeBoolean(
        filters.includeEvidenceImages,
        true
      ),

    dateFrom,
    dateTo,

    selectedTaskIds:
      uniqueMongoIds(
        filters.selectedTaskIds ??
        filters.selectedRiskIds
      ),

    sortBy,
    sortOrder,
  };
};

/* =========================================================
   TASK QUERY
   ========================================================= */

const buildTaskQuery = ({
  projectId,
  filters,
}) => {
  const query = {
    projectId:
      new mongoose.Types.ObjectId(
        projectId
      ),
  };

  if (
    filters.statusFilter !==
    "all"
  ) {
    query.status =
      filters.statusFilter;
  }

  if (
    filters.selectedTaskIds
      .length > 0
  ) {
    query._id = {
      $in:
        filters.selectedTaskIds.map(
          (taskId) =>
            new mongoose.Types.ObjectId(
              taskId
            )
        ),
    };
  }

  if (
    filters.dateFrom ||
    filters.dateTo
  ) {
    query.createdAt = {};

    if (filters.dateFrom) {
      query.createdAt.$gte =
        filters.dateFrom;
    }

    if (filters.dateTo) {
      query.createdAt.$lte =
        filters.dateTo;
    }
  }

  return query;
};

/* =========================================================
   EVIDENCE GROUPING
   ========================================================= */

const groupEvidenceByTask = (
  evidenceRecords
) => {
  const evidenceMap =
    new Map();

  evidenceRecords.forEach(
    (evidence) => {
      const taskId =
        (
          evidence.taskId ??
          evidence.riskId
        ).toString();

      if (
        !evidenceMap.has(
          taskId
        )
      ) {
        evidenceMap.set(
          taskId,
          {
            before: [],
            after: [],
          }
        );
      }

      const groupedEvidence =
        evidenceMap.get(
          taskId
        );

      if (
        evidence.evidenceType ===
        "before"
      ) {
        groupedEvidence.before.push(
          evidence
        );
      }

      if (
        evidence.evidenceType ===
        "after"
      ) {
        groupedEvidence.after.push(
          evidence
        );
      }
    }
  );

  return evidenceMap;
};

/* =========================================================
   EXPORT DATA BUILDER

   Existing Task List se records fetch honge.

   Koi duplicate Task create nahi hoga.
   ========================================================= */

const buildExportData = async ({
  projectId,
  filters,
}) => {
  const taskQuery =
    buildTaskQuery({
      projectId,
      filters,
    });

  const sortDirection =
    filters.sortOrder ===
    "desc"
      ? -1
      : 1;

  const tasks =
    await Task.find(
      taskQuery
    )
      .sort({
        [filters.sortBy]:
          sortDirection,

        _id:
          sortDirection,
      })
      .lean();

  if (
    filters.selectedTaskIds
      .length > 0
  ) {
    const selectedTaskCount =
      await Task.countDocuments({
        _id: {
          $in:
            filters.selectedTaskIds.map(
              (taskId) =>
                new mongoose.Types.ObjectId(
                  taskId
                )
            ),
        },

        projectId:
          new mongoose.Types.ObjectId(
            projectId
          ),
      });

    if (
      selectedTaskCount !==
      filters.selectedTaskIds.length
    ) {
      throw createServiceError(
        400,
        "One or more selected Tasks do not belong to this Project."
      );
    }
  }

  const taskIds =
    tasks.map(
      (task) =>
        task._id
    );

  const evidenceRecords =
    taskIds.length > 0
      ? await Evidence.find({
          $or: [
            {
              taskId: {
                $in:
                  taskIds,
              },
            },
            {
              riskId: {
                $in:
                  taskIds,
              },
            },
          ],
        })
          .sort({
            createdAt: 1,
          })
          .lean()
      : [];

  const evidenceMap =
    groupEvidenceByTask(
      evidenceRecords
    );

  const rows =
    tasks.map(
      (
        task,
        taskIndex
      ) => {
        const groupedEvidence =
          evidenceMap.get(
            task._id.toString()
          ) || {
            before: [],
            after: [],
          };

        return {
          _id:
            task._id,

          serialNo:
            task.serialNo,

          displaySrNo:
            taskIndex + 1,

          description:
            normalizeText(
              task.description
            ),

          status:
            task.status,

          createdAt:
            task.createdAt,

          updatedAt:
            task.updatedAt,

          beforeEvidence:
            groupedEvidence.before,

          afterEvidence:
            groupedEvidence.after,

          beforeCount:
            groupedEvidence.before
              .length,

          afterCount:
            groupedEvidence.after
              .length,
        };
      }
    );

  const totalTasks =
    rows.length;

  const inProgressTasks =
    rows.filter(
      (row) =>
        row.status ===
        "in_progress"
    ).length;

  const completeTasks =
    rows.filter(
      (row) =>
        row.status ===
        "complete"
    ).length;

  const beforeEvidenceCount =
    rows.reduce(
      (total, row) =>
        total +
        row.beforeCount,
      0
    );

  const afterEvidenceCount =
    rows.reduce(
      (total, row) =>
        total +
        row.afterCount,
      0
    );

  const completionPercentage =
    totalTasks > 0
      ? Number(
          (
            (completeTasks /
              totalTasks) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    rows,

    exportedTaskIds:
      taskIds,

    summary: {
      totalTasks,
      inProgressTasks,
      completeTasks,
      beforeEvidenceCount,
      afterEvidenceCount,

      totalEvidenceCount:
        beforeEvidenceCount +
        afterEvidenceCount,

      completionPercentage,
    },
  };
};

/* =========================================================
   FILE NAME HELPERS
   ========================================================= */

const createSafeFileName = (
  value
) => {
  const safeValue =
    normalizeText(
      value
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        100
      );

  return (
    safeValue ||
    "project-report"
  );
};

const createGeneratedFileName = (
  title,
  format
) => {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      );

  const uniqueValue =
    crypto
      .randomBytes(4)
      .toString("hex");

  return `${createSafeFileName(
    title
  )}-${timestamp}-${uniqueValue}.${format}`;
};

const createDownloadFileName = (
  title,
  format
) => {
  return `${createSafeFileName(
    title
  )}.${format}`;
};

/* =========================================================
   DOCUMENT DIRECTORY
   ========================================================= */

const prepareDocumentDirectory =
  async (
    projectId
  ) => {
    await fs.mkdir(
      documentsDirectory,
      {
        recursive: true,
      }
    );

    const projectDirectory =
      path.resolve(
        documentsDirectory,
        projectId
      );

    const relativePath =
      path.relative(
        documentsDirectory,
        projectDirectory
      );

    const isOutsideDirectory =
      relativePath.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relativePath
      );

    if (
      isOutsideDirectory
    ) {
      throw createServiceError(
        400,
        "Document directory is invalid."
      );
    }

    await fs.mkdir(
      projectDirectory,
      {
        recursive: true,
      }
    );

    return projectDirectory;
  };

/* =========================================================
   PUBLIC FILE PATH
   ========================================================= */

const createPublicFilePath = (
  projectId,
  fileName
) => {
  return `/uploads/documents/${projectId}/${fileName}`;
};

/* =========================================================
   LOCAL IMAGE PATH
   ========================================================= */

const getLocalImagePath = (
  imagePath
) => {
  if (
    typeof imagePath !==
      "string" ||
    !imagePath.trim()
  ) {
    return "";
  }

  const normalizedImagePath =
    imagePath
      .trim()
      .replaceAll(
        "\\",
        "/"
      );

  /*
    External URLs are handled separately by getEmbeddableImage.
  */

  if (
    normalizedImagePath.startsWith(
      "http://"
    ) ||
    normalizedImagePath.startsWith(
      "https://"
    )
  ) {
    return "";
  }

  const cleanImagePath =
    normalizedImagePath.replace(
      /^\/+/,
      ""
    );

  const candidatePaths = [
    path.resolve(
      publicDirectory,
      cleanImagePath
    ),
  ];

  /*
    Migration compatibility:

    Old DB paths may point to /uploads/risks while physical
    files have moved to /uploads/tasks, or vice versa.
  */

  if (
    cleanImagePath.startsWith(
      "uploads/risks/"
    )
  ) {
    candidatePaths.push(
      path.resolve(
        publicDirectory,
        cleanImagePath.replace(
          /^uploads\/risks\//,
          "uploads/tasks/"
        )
      )
    );
  }

  if (
    cleanImagePath.startsWith(
      "uploads/tasks/"
    )
  ) {
    candidatePaths.push(
      path.resolve(
        publicDirectory,
        cleanImagePath.replace(
          /^uploads\/tasks\//,
          "uploads/risks/"
        )
      )
    );
  }

  for (
    const absoluteImagePath of
    candidatePaths
  ) {
    const relativePath =
      path.relative(
        publicDirectory,
        absoluteImagePath
      );

    const isOutsidePublic =
      relativePath.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relativePath
      );

    if (
      !isOutsidePublic &&
      fsSync.existsSync(
        absoluteImagePath
      )
    ) {
      return absoluteImagePath;
    }
  }

  return "";
};

/* =========================================================
   EMBEDDABLE IMAGE

   JPG and PNG direct use hongi.

   WEBP sharp ke through PNG mein convert hogi.
   ========================================================= */

const getEmbeddableImage =
  async (
    imagePath
  ) => {
    const normalizedImagePath =
      normalizeText(
        imagePath
      );

    if (!normalizedImagePath) {
      return null;
    }

    try {
      let fileBuffer;
      let extension = "";

      if (
        normalizedImagePath.startsWith(
          "http://"
        ) ||
        normalizedImagePath.startsWith(
          "https://"
        )
      ) {
        const response =
          await fetch(
            normalizedImagePath
          );

        if (!response.ok) {
          console.warn(
            "Evidence image fetch failed:",
            normalizedImagePath,
            response.status
          );

          return null;
        }

        fileBuffer =
          Buffer.from(
            await response.arrayBuffer()
          );

        extension =
          path
            .extname(
              new URL(
                normalizedImagePath
              ).pathname
            )
            .toLowerCase();
      } else {
        const absoluteImagePath =
          getLocalImagePath(
            normalizedImagePath
          );

        if (!absoluteImagePath) {
          console.warn(
            "Evidence image file was not found:",
            normalizedImagePath
          );

          return null;
        }

        extension =
          path
            .extname(
              absoluteImagePath
            )
            .toLowerCase();

        fileBuffer =
          await fs.readFile(
            absoluteImagePath
          );
      }

      if (
        !SUPPORTED_IMAGE_EXTENSIONS.includes(
          extension
        )
      ) {
        console.warn(
          "Unsupported Evidence image extension:",
          normalizedImagePath
        );

        return null;
      }

      if (
        extension === ".jpg" ||
        extension === ".jpeg"
      ) {
        return {
          buffer:
            fileBuffer,

          type:
            "jpg",
        };
      }

      if (
        extension === ".png"
      ) {
        return {
          buffer:
            fileBuffer,

          type:
            "png",
        };
      }

      if (
        extension === ".webp"
      ) {
        try {
          const sharpModule =
            await import(
              "sharp"
            );

          const sharp =
            sharpModule.default ||
            sharpModule;

          const pngBuffer =
            await sharp(
              fileBuffer
            )
              .png()
              .toBuffer();

          return {
            buffer:
              pngBuffer,

            type:
              "png",
          };
        } catch (error) {
          console.warn(
            "WEBP Evidence conversion failed:",
            normalizedImagePath,
            error?.message
          );

          return null;
        }
      }

      return null;
    } catch (error) {
      console.warn(
        "Evidence image could not be embedded:",
        normalizedImagePath,
        error?.message
      );

      return null;
    }
  };

/* =========================================================
   STATUS LABEL
   ========================================================= */

const getStatusLabel = (
  status
) => {
  return status ===
    "complete"
    ? "Complete"
    : "In Progress";
};

/* =========================================================
   DATE FORMATTER
   ========================================================= */

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(date);
};

/* =========================================================
   PDF GENERATOR
   ========================================================= */

const generatePdfDocument =
  async ({
    outputPath,
    title,
    description,
    layout,
    project,
    projectCode,
    projectTitle,
    filters,
    rows,
    summary,
  }) => {
    /*
      PDFKit WEBP ko direct support nahi karta.
      Detailed Evidence layout ke liye images pehle normalize
      karke JPG/PNG buffers mein prepare ki jati hain.
    */

    const pdfImageMap =
      new Map();

    if (
      filters.includeEvidenceImages
    ) {
      for (const row of rows) {
        const evidenceRecords = [
          ...(filters.includeBeforeEvidence
            ? row.beforeEvidence
            : []),

          ...(filters.includeAfterEvidence
            ? row.afterEvidence
            : []),
        ];

        for (
          const evidence of
          evidenceRecords
        ) {
          const image =
            await getEmbeddableImage(
              evidence.imagePath
            );

          if (image) {
            pdfImageMap.set(
              evidence._id.toString(),
              image
            );
          }
        }
      }
    }

    let PDFDocument;

    try {
      const pdfKitModule =
        await import(
          "pdfkit"
        );

      PDFDocument =
        pdfKitModule.default ||
        pdfKitModule;
    } catch {
      throw createServiceError(
        500,
        'PDF generation requires the "pdfkit" package.'
      );
    }

    await new Promise(
      (
        resolve,
        reject
      ) => {
        const pdf =
          new PDFDocument({
            size:
              "A4",

            layout:
              layout ===
              "task_register"
                ? "landscape"
                : "portrait",

            margin:
              40,

            bufferPages:
              true,

            info: {
              Title:
                title,

              Subject:
                description ||
                title,

              Author:
                "Zorays Project Tracker",
            },
          });

        const outputStream =
          fsSync.createWriteStream(
            outputPath
          );

        pdf.pipe(
          outputStream
        );

        outputStream.on(
          "finish",
          resolve
        );

        outputStream.on(
          "error",
          reject
        );

        pdf.on(
          "error",
          reject
        );

        const addPageIfNeeded = (
          requiredHeight = 120
        ) => {
          if (
            pdf.y +
              requiredHeight >
            pdf.page.height -
              50
          ) {
            pdf.addPage();
          }
        };

        pdf
          .roundedRect(
            pdf.page.margins.left,
            pdf.page.margins.top,
            pdf.page.width -
              pdf.page.margins.left -
              pdf.page.margins.right,
            54,
            8
          )
          .fill(
            "#0F766E"
          );

        pdf
          .font(
            "Helvetica-Bold"
          )
          .fontSize(18)
          .fillColor(
            "#FFFFFF"
          )
          .text(
            title,
            pdf.page.margins.left + 16,
            pdf.page.margins.top + 12,
            {
              width:
                pdf.page.width -
                pdf.page.margins.left -
                pdf.page.margins.right -
                32,

              align:
                "center",
            }
          );

        pdf.y =
          pdf.page.margins.top +
          68;

        pdf
          .font(
            "Helvetica-Bold"
          )
          .fontSize(11)
          .fillColor(
            "#111827"
          )
          .text(
            projectTitle,
            {
              align:
                "center",
            }
          );

        pdf
          .moveDown(0.15)
          .font(
            "Helvetica"
          )
          .fontSize(9)
          .fillColor(
            "#4B5563"
          )
          .text(
            `Project Reference: ${projectCode}`,
            {
              align:
                "center",
            }
          );

        if (description) {
          pdf
            .moveDown(0.5)
            .fontSize(9)
            .text(
              description,
              {
                align:
                  "center",
              }
            );
        }

        pdf
          .moveDown()
          .strokeColor(
            "#D1D5DB"
          )
          .moveTo(
            pdf.page.margins.left,
            pdf.y
          )
          .lineTo(
            pdf.page.width -
              pdf.page.margins.right,
            pdf.y
          )
          .stroke()
          .moveDown();

        if (
          filters.includeProjectDetails
        ) {
          const details =
            buildProjectReportDetails(
              project
            );

          pdf
            .font(
              "Helvetica-Bold"
            )
            .fontSize(11)
            .fillColor(
              "#111827"
            )
            .text(
              "Project Details"
            );

          pdf
            .moveDown(0.3)
            .font(
              "Helvetica"
            )
            .fontSize(9)
            .fillColor(
              "#374151"
            )
            .text(
              `Project: ${projectTitle}`
            )
            .text(
              `Project Reference: ${projectCode}`
            );

          if (details.clientName) {
            pdf.text(
              `Client: ${details.clientName}${details.clientCompany ? ` | ${details.clientCompany}` : ""}`
            );
          }

          if (details.siteName) {
            pdf.text(
              `Site: ${details.siteName}`
            );
          }

          if (details.siteLocation) {
            pdf.text(
              `Location: ${details.siteLocation}`
            );
          }

          if (
            details.systemCapacityKW >
            0
          ) {
            pdf.text(
              `System Capacity: ${details.systemCapacityKW} kW`
            );
          }

          if (details.status) {
            pdf.text(
              `Project Status: ${details.status}`
            );
          }

          pdf
            .text(
              `Start Date: ${formatDate(details.startDate)}`
            )
            .text(
              `Expected Completion: ${formatDate(details.expectedCompletionDate)}`
            )
            .text(
              `Overall Progress: ${details.progress.overall}%`
            )
            .text(
              `Rectification: ${details.progress.rectification}% | Evidence: ${details.progress.evidence}% | Testing: ${details.progress.testing}% | Action Plan: ${details.progress.actionPlan}%`
            );

          pdf.moveDown();
        }

        pdf
          .font(
            "Helvetica-Bold"
          )
          .fontSize(11)
          .fillColor(
            "#111827"
          )
          .text(
            "Report Summary"
          )
          .moveDown(0.3)
          .font(
            "Helvetica"
          )
          .fontSize(9)
          .fillColor(
            "#374151"
          )
          .text(
            `Total Tasks: ${summary.totalTasks}`
          )
          .text(
            `In Progress: ${summary.inProgressTasks}`
          )
          .text(
            `Complete: ${summary.completeTasks}`
          )
          .text(
            `Before Evidence: ${summary.beforeEvidenceCount}`
          )
          .text(
            `After Evidence: ${summary.afterEvidenceCount}`
          )
          .text(
            `Completion: ${summary.completionPercentage}%`
          );

        if (
          rows.length === 0
        ) {
          pdf
            .moveDown()
            .font(
              "Helvetica"
            )
            .fontSize(10)
            .fillColor(
              "#4B5563"
            )
            .text(
              "No matching Task records were found."
            );
        }

        rows.forEach(
          (row) => {
            addPageIfNeeded(
              150
            );

            pdf
              .moveDown()
              .strokeColor(
                "#E5E7EB"
              )
              .moveTo(
                pdf.page.margins.left,
                pdf.y
              )
              .lineTo(
                pdf.page.width -
                  pdf.page.margins.right,
                pdf.y
              )
              .stroke()
              .moveDown(0.5);

            pdf
              .font(
                "Helvetica-Bold"
              )
              .fontSize(11)
              .fillColor(
                "#111827"
              )
              .text(
                `Sr. No. ${row.displaySrNo}`
              );

            pdf
              .moveDown(0.25)
              .font(
                "Helvetica-Bold"
              )
              .fontSize(9)
              .fillColor(
                "#111827"
              )
              .text(
                "Description:"
              );

            pdf
              .font(
                "Helvetica"
              )
              .fontSize(9)
              .fillColor(
                "#374151"
              )
              .text(
                row.description ||
                  "—",
                {
                  lineGap: 2,
                }
              );

            pdf
              .moveDown(0.25)
              .font(
                "Helvetica-Bold"
              )
              .fillColor(
                row.status ===
                  "complete"
                  ? "#047857"
                  : "#B45309"
              )
              .text(
                `Status: ${getStatusLabel(
                  row.status
                )}`
              );

            pdf
              .font(
                "Helvetica"
              )
              .fillColor(
                "#4B5563"
              )
              .text(
                `Before Evidence: ${row.beforeCount} | After Evidence: ${row.afterCount}`
              );

            if (
              !filters.includeEvidenceImages
            ) {
              return;
            }

            const evidenceGroups =
              [];

            if (
              filters.includeBeforeEvidence
            ) {
              evidenceGroups.push({
                label:
                  "Before Evidence",

                records:
                  row.beforeEvidence,
              });
            }

            if (
              filters.includeAfterEvidence
            ) {
              evidenceGroups.push({
                label:
                  "After Evidence",

                records:
                  row.afterEvidence,
              });
            }

            evidenceGroups.forEach(
              (group) => {
                if (
                  group.records
                    .length === 0
                ) {
                  return;
                }

                addPageIfNeeded(60);

                pdf
                  .moveDown(0.5)
                  .font(
                    "Helvetica-Bold"
                  )
                  .fontSize(10)
                  .fillColor(
                    "#111827"
                  )
                  .text(
                    group.label
                  );

                group.records.forEach(
                  (
                    evidence,
                    evidenceIndex
                  ) => {
                    addPageIfNeeded(
                      230
                    );

                    pdf
                      .font(
                        "Helvetica"
                      )
                      .fontSize(8)
                      .fillColor(
                        "#6B7280"
                      )
                      .text(
                        `${group.label} ${evidenceIndex + 1}`
                      );

                    const preparedImage =
                      pdfImageMap.get(
                        evidence._id.toString()
                      );

                    if (preparedImage) {
                      try {
                        const imageWidth =
                          Math.min(
                            360,
                            pdf.page.width -
                              pdf.page.margins.left -
                              pdf.page.margins.right
                          );

                        const imageHeight =
                          190;

                        const imageX =
                          pdf.page.margins.left +
                          (
                            pdf.page.width -
                            pdf.page.margins.left -
                            pdf.page.margins.right -
                            imageWidth
                          ) /
                          2;

                        pdf.image(
                          preparedImage.buffer,
                          imageX,
                          pdf.y + 4,
                          {
                            fit: [
                              imageWidth,
                              imageHeight,
                            ],

                            align:
                              "center",

                            valign:
                              "center",
                          }
                        );

                        pdf.y +=
                          imageHeight +
                          12;
                      } catch {
                        pdf
                          .fillColor(
                            "#9CA3AF"
                          )
                          .fontSize(8)
                          .text(
                            "Evidence image unavailable."
                          );
                      }
                    } else {
                      pdf
                        .fillColor(
                          "#9CA3AF"
                        )
                        .fontSize(8)
                        .text(
                          "Evidence image unavailable."
                        );
                    }

                    pdf.moveDown(
                      0.35
                    );
                  }
                );
              }
            );
          }
        );

        const pageRange =
          pdf.bufferedPageRange();

        for (
          let pageIndex = 0;
          pageIndex <
          pageRange.count;
          pageIndex += 1
        ) {
          pdf.switchToPage(
            pageIndex
          );

          pdf
            .font(
              "Helvetica"
            )
            .fontSize(8)
            .fillColor(
              "#6B7280"
            )
            .text(
              `Generated ${formatDate(
                new Date()
              )} | Page ${pageIndex + 1} of ${pageRange.count}`,
              pdf.page.margins.left,
              pdf.page.height -
                30,
              {
                width:
                  pdf.page.width -
                  pdf.page.margins.left -
                  pdf.page.margins.right,

                align:
                  "center",
              }
            );
        }

        pdf.end();
      }
    );
  };

/* =========================================================
   DOCX GENERATOR
   ========================================================= */

const generateDocxDocument =
  async ({
    outputPath,
    title,
    description,
    layout,
    project,
    projectCode,
    projectTitle,
    filters,
    rows,
    summary,
  }) => {
    let docx;

    try {
      docx =
        await import(
          "docx"
        );
    } catch {
      throw createServiceError(
        500,
        'DOCX generation requires the "docx" package.'
      );
    }

    const {
      AlignmentType,
      Document,
      Footer,
      HeadingLevel,
      ImageRun,
      Packer,
      PageNumber,
      PageOrientation,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      WidthType,
    } = docx;

    const children = [
      new Paragraph({
        alignment:
          AlignmentType.CENTER,

        heading:
          HeadingLevel.TITLE,

        children: [
          new TextRun({
            text: title,
            bold: true,
          }),
        ],
      }),

      new Paragraph({
        alignment:
          AlignmentType.CENTER,

        children: [
          new TextRun({
            text:
              `${projectTitle} | ${projectCode}`,
          }),
        ],
      }),
    ];

    if (description) {
      children.push(
        new Paragraph({
          alignment:
            AlignmentType.CENTER,

          children: [
            new TextRun({
              text:
                description,

              italics:
                true,
            }),
          ],
        })
      );
    }

    if (
      filters.includeProjectDetails
    ) {
      const details =
        buildProjectReportDetails(
          project
        );

      children.push(
        new Paragraph({
          heading:
            HeadingLevel.HEADING_1,

          text:
            "Project Details",
        }),

        new Paragraph({
          text:
            `Project: ${projectTitle}`,
        }),

        new Paragraph({
          text:
            `Project Reference: ${projectCode}`,
        }),

        ...(details.clientName
          ? [
              new Paragraph({
                text:
                  `Client: ${details.clientName}${details.clientCompany ? ` | ${details.clientCompany}` : ""}`,
              }),
            ]
          : []),

        ...(details.siteName
          ? [
              new Paragraph({
                text:
                  `Site: ${details.siteName}`,
              }),
            ]
          : []),

        ...(details.siteLocation
          ? [
              new Paragraph({
                text:
                  `Location: ${details.siteLocation}`,
              }),
            ]
          : []),

        ...(details.systemCapacityKW > 0
          ? [
              new Paragraph({
                text:
                  `System Capacity: ${details.systemCapacityKW} kW`,
              }),
            ]
          : []),

        new Paragraph({
          text:
            `Project Status: ${details.status || "—"}`,
        }),

        new Paragraph({
          text:
            `Start Date: ${formatDate(details.startDate)}`,
        }),

        new Paragraph({
          text:
            `Expected Completion: ${formatDate(details.expectedCompletionDate)}`,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text:
                `Overall Progress: ${details.progress.overall}%`,
              bold: true,
            }),
          ],
        }),

        new Paragraph({
          text:
            `Rectification: ${details.progress.rectification}% | Evidence: ${details.progress.evidence}% | Testing: ${details.progress.testing}% | Action Plan: ${details.progress.actionPlan}%`,
        })
      );
    }

    children.push(
      new Paragraph({
        heading:
          HeadingLevel.HEADING_1,

        text:
          "Report Summary",
      }),

      new Table({
        width: {
          size: 100,
          type:
            WidthType.PERCENTAGE,
        },

        rows: [
          new TableRow({
            children: [
              "Total Tasks",
              "In Progress",
              "Complete",
              "Before Evidence",
              "After Evidence",
              "Completion",
            ].map(
              (value) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text:
                            value,

                          bold:
                            true,
                        }),
                      ],
                    }),
                  ],
                })
            ),
          }),

          new TableRow({
            children: [
              summary.totalTasks,
              summary.inProgressTasks,
              summary.completeTasks,
              summary.beforeEvidenceCount,
              summary.afterEvidenceCount,
              `${summary.completionPercentage}%`,
            ].map(
              (value) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      text:
                        String(
                          value
                        ),
                    }),
                  ],
                })
            ),
          }),
        ],
      }),

      new Paragraph({
        heading:
          HeadingLevel.HEADING_1,

        text:
          "Task Register",
      })
    );

    const headerCells = [
      "Sr. No.",

      "Description",
      "Before",
      "After",
      "Status",
    ];

    const tableRows = [
      new TableRow({
        children:
          headerCells.map(
            (heading) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          heading,

                        bold:
                          true,
                      }),
                    ],
                  }),
                ],
              })
          ),
      }),

      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              row.displaySrNo,

              row.description ||
                "—",

              row.beforeCount,

              row.afterCount,

              getStatusLabel(
                row.status
              ),
            ].map(
              (value) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      text:
                        String(
                          value
                        ),
                    }),
                  ],
                })
            ),
          })
      ),
    ];

    children.push(
      new Table({
        width: {
          size: 100,
          type:
            WidthType.PERCENTAGE,
        },

        rows:
          tableRows,
      })
    );

    if (
      filters.includeEvidenceImages
    ) {
      for (const row of rows) {
        children.push(
          new Paragraph({
            heading:
              HeadingLevel.HEADING_2,

            text:
              `Sr. No. ${row.displaySrNo}`,
          }),

          new Paragraph({
            children: [
              new TextRun({
                text:
                  "Description: ",

                bold: true,
              }),

              new TextRun({
                text:
                  row.description ||
                  "—",
              }),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({
                text:
                  "Status: ",

                bold: true,
              }),

              new TextRun({
                text:
                  getStatusLabel(
                    row.status
                  ),
              }),
            ],
          })
        );

        const evidenceGroups =
          [];

        if (
          filters.includeBeforeEvidence
        ) {
          evidenceGroups.push({
            label:
              "Before Evidence",

            records:
              row.beforeEvidence,
          });
        }

        if (
          filters.includeAfterEvidence
        ) {
          evidenceGroups.push({
            label:
              "After Evidence",

            records:
              row.afterEvidence,
          });
        }

        for (
          const group of
          evidenceGroups
        ) {
          children.push(
            new Paragraph({
              heading:
                HeadingLevel.HEADING_3,

              text:
                group.label,
            })
          );

          if (
            group.records.length ===
            0
          ) {
            children.push(
              new Paragraph({
                text:
                  "No evidence available.",
              })
            );

            continue;
          }

          for (
            const evidence of
            group.records
          ) {
            const image =
              await getEmbeddableImage(
                evidence.imagePath
              );

            if (image) {
              children.push(
                new Paragraph({
                  alignment:
                    AlignmentType.CENTER,

                  children: [
                    new ImageRun({
                      data:
                        image.buffer,

                      type:
                        image.type,

                      transformation: {
                        width: 360,
                        height: 225,
                      },
                    }),
                  ],
                })
              );
            } else {
              children.push(
                new Paragraph({
                  text:
                    evidence.imagePath ||
                    "Image unavailable",
                })
              );
            }
          }
        }
      }
    }

    const document =
      new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  orientation:
                    layout ===
                    "task_register"
                      ? PageOrientation.LANDSCAPE
                      : PageOrientation.PORTRAIT,
                },

                margin: {
                  top: 720,
                  right: 720,
                  bottom: 720,
                  left: 720,
                },
              },
            },

            footers: {
              default:
                new Footer({
                  children: [
                    new Paragraph({
                      alignment:
                        AlignmentType.CENTER,

                      children: [
                        new TextRun({
                          text:
                            `${projectTitle} | ${projectCode} | Page `,
                          size: 18,
                          color:
                            "6B7280",
                        }),

                        new TextRun({
                          children: [
                            PageNumber.CURRENT,
                          ],
                          size: 18,
                          color:
                            "6B7280",
                        }),
                      ],
                    }),
                  ],
                }),
            },

            children,
          },
        ],
      });

    const buffer =
      await Packer.toBuffer(
        document
      );

    await fs.writeFile(
      outputPath,
      buffer
    );
  };

/* =========================================================
   XLSX GENERATOR
   ========================================================= */

const generateXlsxDocument =
  async ({
    outputPath,
    title,
    description,
    project,
    projectCode,
    projectTitle,
    filters,
    rows,
    summary,
  }) => {
    let ExcelJS;

    try {
      const excelModule =
        await import(
          "exceljs"
        );

      ExcelJS =
        excelModule.default ||
        excelModule;
    } catch {
      throw createServiceError(
        500,
        'XLSX generation requires the "exceljs" package.'
      );
    }

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Zorays Project Tracker";

    workbook.created =
      new Date();

    workbook.modified =
      new Date();

    const summarySheet =
      workbook.addWorksheet(
        "Report Summary"
      );

    summarySheet.columns = [
      {
        header: "Field",
        key: "field",
        width: 28,
      },

      {
        header: "Value",
        key: "value",
        width: 50,
      },
    ];

    const projectDetails =
      buildProjectReportDetails(
        project
      );

    summarySheet.addRows([
      {
        field:
          "Report Title",

        value:
          title,
      },

      {
        field:
          "Description",

        value:
          description || "",
      },

      {
        field:
          "Project",

        value:
          projectTitle,
      },

      {
        field:
          "Project Reference",

        value:
          projectCode,
      },

      {
        field:
          "Client",

        value:
          [
            projectDetails.clientName,
            projectDetails.clientCompany,
          ]
            .filter(Boolean)
            .join(" | "),
      },

      {
        field:
          "Site",

        value:
          projectDetails.siteName,
      },

      {
        field:
          "Location",

        value:
          projectDetails.siteLocation,
      },

      {
        field:
          "System Capacity (kW)",

        value:
          projectDetails.systemCapacityKW ||
          "",
      },

      {
        field:
          "Project Status",

        value:
          projectDetails.status,
      },

      {
        field:
          "Overall Progress",

        value:
          `${projectDetails.progress.overall}%`,
      },

      {
        field:
          "Rectification Progress",

        value:
          `${projectDetails.progress.rectification}%`,
      },

      {
        field:
          "Evidence Progress",

        value:
          `${projectDetails.progress.evidence}%`,
      },

      {
        field:
          "Testing Progress",

        value:
          `${projectDetails.progress.testing}%`,
      },

      {
        field:
          "Action Plan Progress",

        value:
          `${projectDetails.progress.actionPlan}%`,
      },


      {
        field:
          "Total Tasks",

        value:
          summary.totalTasks,
      },

      {
        field:
          "In Progress",

        value:
          summary.inProgressTasks,
      },

      {
        field:
          "Complete",

        value:
          summary.completeTasks,
      },

      {
        field:
          "Before Evidence",

        value:
          summary.beforeEvidenceCount,
      },

      {
        field:
          "After Evidence",

        value:
          summary.afterEvidenceCount,
      },

      {
        field:
          "Completion Percentage",

        value:
          `${summary.completionPercentage}%`,
      },

      {
        field:
          "Generated At",

        value:
          new Date(),
      },
    ]);

    summarySheet.getRow(
      1
    ).font = {
      bold: true,
    };

    summarySheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    const taskSheet =
      workbook.addWorksheet(
        "Task Register"
      );

    taskSheet.columns = [
      {
        header:
          "Sr. No.",

        key:
          "displaySrNo",

        width: 10,
      },

      {
        header:
          "Description",

        key:
          "description",

        width: 62,
      },

      {
        header:
          "Before Picture",

        key:
          "beforePicture",

        width: 28,
      },

      {
        header:
          "After Picture",

        key:
          "afterPicture",

        width: 28,
      },

      {
        header:
          "Complete",

        key:
          "complete",

        width: 12,
      },

      {
        header:
          "In Progress",

        key:
          "inProgress",

        width: 14,
      },
    ];

    taskSheet.getRow(
      1
    ).font = {
      bold: true,
    };

    taskSheet.getRow(
      1
    ).alignment = {
      horizontal:
        "center",

      vertical:
        "middle",

      wrapText:
        true,
    };

    taskSheet.getRow(
      1
    ).height = 28;

    taskSheet.views = [
      {
        state:
          "frozen",

        ySplit:
          1,
      },
    ];

    for (
      let rowIndex = 0;
      rowIndex <
      rows.length;
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex];

      const excelRowNumber =
        rowIndex + 2;

      taskSheet.addRow({
        displaySrNo:
          row.displaySrNo,

        description:
          row.description,

        beforePicture:
          "",

        afterPicture:
          "",

        complete:
          row.status ===
          "complete"
            ? "✓"
            : "",

        inProgress:
          row.status ===
          "in_progress"
            ? "✓"
            : "",
      });

      const excelRow =
        taskSheet.getRow(
          excelRowNumber
        );

      excelRow.height =
        filters.includeEvidenceImages
          ? 92
          : 42;

      excelRow.alignment = {
        vertical:
          "middle",

        wrapText:
          true,
      };

      excelRow.getCell(
        "A"
      ).alignment = {
        horizontal:
          "center",

        vertical:
          "middle",
      };

      excelRow.getCell(
        "E"
      ).alignment = {
        horizontal:
          "center",

        vertical:
          "middle",
      };

      excelRow.getCell(
        "F"
      ).alignment = {
        horizontal:
          "center",

        vertical:
          "middle",
      };

      if (
        !filters.includeEvidenceImages
      ) {
        continue;
      }

      const beforeRecord =
        filters.includeBeforeEvidence
          ? row.beforeEvidence[0]
          : undefined;

      const afterRecord =
        filters.includeAfterEvidence
          ? row.afterEvidence[0]
          : undefined;

      const imageEntries = [
        {
          record:
            beforeRecord,

          column:
            2,
        },

        {
          record:
            afterRecord,

          column:
            3,
        },
      ];

      for (
        const imageEntry of
        imageEntries
      ) {
        if (!imageEntry.record) {
          continue;
        }

        const image =
          await getEmbeddableImage(
            imageEntry.record
              .imagePath
          );

        if (!image) {
          const cell =
            taskSheet.getCell(
              excelRowNumber,
              imageEntry.column + 1
            );

          cell.value =
            "Image unavailable";

          cell.alignment = {
            horizontal:
              "center",

            vertical:
              "middle",

            wrapText:
              true,
          };

          continue;
        }

        const imageId =
          workbook.addImage({
            buffer:
              image.buffer,

            extension:
              image.type ===
              "jpg"
                ? "jpeg"
                : "png",
          });

        taskSheet.addImage(
          imageId,
          {
            tl: {
              col:
                imageEntry.column +
                0.08,

              row:
                excelRowNumber -
                1 +
                0.08,
            },

            ext: {
              width:
                175,

              height:
                105,
            },
          }
        );
      }
    }

    taskSheet.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },

      to: {
        row: 1,
        column:
          taskSheet.columns.length,
      },
    };

    const evidenceSheet =
      workbook.addWorksheet(
        "Evidence Register"
      );

    evidenceSheet.columns = [
      {
        header:
          "Sr. No.",

        key:
          "serialNo",

        width: 12,
      },

      {
        header:
          "Evidence Type",

        key:
          "evidenceType",

        width: 18,
      },

      {
        header:
          "Image Path",

        key:
          "imagePath",

        width: 65,
      },

      {
        header:
          "Preview",

        key:
          "preview",

        width: 25,
      },
    ];

    evidenceSheet.getRow(
      1
    ).font = {
      bold: true,
    };

    let evidenceRowNumber = 2;

    for (const row of rows) {
      const evidenceGroups =
        [];

      if (
        filters.includeBeforeEvidence
      ) {
        evidenceGroups.push({
          label: "Before",

          records:
            row.beforeEvidence,
        });
      }

      if (
        filters.includeAfterEvidence
      ) {
        evidenceGroups.push({
          label: "After",

          records:
            row.afterEvidence,
        });
      }

      for (
        const group of
        evidenceGroups
      ) {
        for (
          const evidence of
          group.records
        ) {
          evidenceSheet.addRow({
            serialNo:
              row.displaySrNo,

            evidenceType:
              group.label,

            imagePath:
              evidence.imagePath,

            preview: "",
          });

          if (
            filters.includeEvidenceImages
          ) {
            const image =
              await getEmbeddableImage(
                evidence.imagePath
              );

            if (image) {
              const imageId =
                workbook.addImage({
                  buffer:
                    image.buffer,

                  extension:
                    image.type ===
                    "jpg"
                      ? "jpeg"
                      : "png",
                });

              evidenceSheet.addImage(
                imageId,
                {
                  tl: {
                    col: 4,

                    row:
                      evidenceRowNumber -
                      1,
                  },

                  ext: {
                    width: 150,
                    height: 95,
                  },
                }
              );

              evidenceSheet.getRow(
                evidenceRowNumber
              ).height = 75;
            }
          }

          evidenceRowNumber +=
            1;
        }
      }
    }

    evidenceSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    evidenceSheet.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },

      to: {
        row: 1,

        column:
          evidenceSheet.columns.length,
      },
    };

    evidenceSheet.eachRow(
      {
        includeEmpty: false,
      },
      (row) => {
        row.alignment = {
          vertical: "top",
          wrapText: true,
        };
      }
    );

    await workbook.xlsx.writeFile(
      outputPath
    );
  };

/* =========================================================
   GENERATOR SELECTOR
   ========================================================= */

const generateDocumentFile =
  async ({
    format,
    ...generationData
  }) => {
    if (format === "pdf") {
      return generatePdfDocument(
        generationData
      );
    }

    if (format === "docx") {
      return generateDocxDocument(
        generationData
      );
    }

    if (format === "xlsx") {
      return generateXlsxDocument(
        generationData
      );
    }

    throw createServiceError(
      400,
      "Unsupported export format."
    );
  };

/* =========================================================
   DOCUMENT RESPONSE
   ========================================================= */

const buildDocumentResponse = (
  document
) => {
  const plainDocument =
    toPlainObject(
      document
    );

  if (!plainDocument) {
    return plainDocument;
  }

  return {
    ...plainDocument,

    projectReferenceNo:
      plainDocument.projectCode,
  };
};

/* =========================================================
   GENERATE DOCUMENT
   ========================================================= */

export const generateDocumentService =
  async (
    payload,
    generatedBy
  ) => {
    const projectId =
      validateMongoId(
        payload?.projectId,
        "Project ID"
      );

    const generatedByUserId =
      normalizeGeneratedBy(
        generatedBy
      );

    const requestedTitle =
      normalizeText(
        payload?.title
      );

    const description =
      normalizeText(
        payload?.description
      );

    const layout =
      normalizeLowercaseText(
        payload?.layout
      ) ||
      "task_register";

    const format =
      normalizeLowercaseText(
        payload?.format
      );

    if (
      requestedTitle &&
      (
        requestedTitle.length < 3 ||
        requestedTitle.length > 250
      )
    ) {
      throw createServiceError(
        400,
        "Report title must contain between 3 and 250 characters when provided."
      );
    }

    if (
      description.length >
      2000
    ) {
      throw createServiceError(
        400,
        "Report description cannot exceed 2000 characters."
      );
    }

    if (
      !DOCUMENT_LAYOUTS.includes(
        layout
      )
    ) {
      throw createServiceError(
        400,
        "Report layout is invalid."
      );
    }

    if (
      !DOCUMENT_FORMATS.includes(
        format
      )
    ) {
      throw createServiceError(
        400,
        "Export format must be pdf, docx or xlsx."
      );
    }

    /*
      Report generate hone se pehle Project ke Task/Evidence
      derived metrics refresh karein taa-ke exported progress
      stale zero values na ho.
    */

    await syncProjectDerivedMetrics(
      projectId
    );

    const {
      project,
      projectCode,
      projectTitle,
    } =
      await getProjectRecord(
        projectId
      );

    const title =
      requestedTitle ||
      projectTitle;

    const filters =
      normalizeDocumentFilters(
        payload?.filters
      );

    const documentRecord =
      await ProjectDocument.create({
        projectId:
          project._id,

        projectCode,

        projectTitle,

        title,

        ...(description
          ? {
              description,
            }
          : {}),

        layout,
        format,

        status:
          "generating",

        filters,

        generatedBy:
          generatedByUserId,
      });

    let outputPath = "";

    try {
      const exportData =
        await buildExportData({
          projectId,
          filters,
        });

      const projectDirectory =
        await prepareDocumentDirectory(
          projectId
        );

      const storageFileName =
        createGeneratedFileName(
          title,
          format
        );

      const downloadFileName =
        createDownloadFileName(
          title,
          format
        );

      outputPath =
        path.resolve(
          projectDirectory,
          storageFileName
        );

      await generateDocumentFile({
        format,
        outputPath,

        title,
        description,
        layout,

        project,
        projectCode,
        projectTitle,

        filters,

        rows:
          exportData.rows,

        summary:
          exportData.summary,
      });

      const fileStats =
        await fs.stat(
          outputPath
        );

      documentRecord.status =
        "completed";

      documentRecord.exportedTaskIds =
        exportData.exportedTaskIds;

      documentRecord.summary =
        exportData.summary;

      documentRecord.fileName =
        downloadFileName;

      documentRecord.filePath =
        createPublicFilePath(
          projectId,
          storageFileName
        );

      documentRecord.mimeType =
        DOCUMENT_MIME_TYPES[
          format
        ];

      documentRecord.fileSize =
        fileStats.size;

      documentRecord.generatedAt =
        new Date();

      documentRecord.failureReason =
        undefined;

      await documentRecord.save();

      return {
        document:
          buildDocumentResponse(
            documentRecord
          ),

        exportedRecords:
          exportData.rows.length,
      };
    } catch (error) {
      if (outputPath) {
        try {
          await fs.unlink(
            outputPath
          );
        } catch (fileError) {
          if (
            fileError?.code !==
            "ENOENT"
          ) {
            console.error(
              "Generated document cleanup failed:",
              fileError
            );
          }
        }
      }

      documentRecord.status =
        "failed";

      documentRecord.failureReason =
        normalizeText(
          error?.message
        ) ||
        "Document generation failed.";

      documentRecord.fileName =
        undefined;

      documentRecord.filePath =
        undefined;

      documentRecord.mimeType =
        undefined;

      documentRecord.fileSize =
        undefined;

      documentRecord.generatedAt =
        undefined;

      try {
        await documentRecord.save();
      } catch (historyError) {
        console.error(
          "Document failure history update failed:",
          historyError
        );
      }

      throw error;
    }
  };

/* =========================================================
   GET DOCUMENT HISTORY
   ========================================================= */

export const getDocumentsService =
  async ({
    projectId,
    search,
    layout,
    format,
    status,
    generatedBy,
    dateFrom,
    dateTo,
    page,
    limit,
    sortBy,
    sortOrder,
  } = {}) => {
    const query = {};

    if (projectId) {
      query.projectId =
        new mongoose.Types.ObjectId(
          validateMongoId(
            projectId,
            "Project ID"
          )
        );
    }

    if (generatedBy) {
      query.generatedBy =
        new mongoose.Types.ObjectId(
          validateMongoId(
            generatedBy,
            "Generated By user ID"
          )
        );
    }

    const normalizedSearch =
      normalizeText(
        search
      );

    if (normalizedSearch) {
      const searchRegex =
        new RegExp(
          escapeRegex(
            normalizedSearch
          ),
          "i"
        );

      query.$or = [
        {
          title:
            searchRegex,
        },

        {
          description:
            searchRegex,
        },

        {
          projectTitle:
            searchRegex,
        },

        {
          projectCode:
            searchRegex,
        },

        {
          fileName:
            searchRegex,
        },
      ];
    }

    const normalizedLayout =
      normalizeLowercaseText(
        layout
      );

    if (
      DOCUMENT_LAYOUTS.includes(
        normalizedLayout
      )
    ) {
      query.layout =
        normalizedLayout;
    }

    const normalizedFormat =
      normalizeLowercaseText(
        format
      );

    if (
      DOCUMENT_FORMATS.includes(
        normalizedFormat
      )
    ) {
      query.format =
        normalizedFormat;
    }

    const normalizedStatus =
      normalizeLowercaseText(
        status
      );

    if (
      DOCUMENT_STATUSES.includes(
        normalizedStatus
      )
    ) {
      query.status =
        normalizedStatus;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};

      if (dateFrom) {
        const startDate =
          new Date(
            dateFrom
          );

        if (
          Number.isNaN(
            startDate.getTime()
          )
        ) {
          throw createServiceError(
            400,
            "Date From is invalid."
          );
        }

        startDate.setHours(
          0,
          0,
          0,
          0
        );

        query.createdAt.$gte =
          startDate;
      }

      if (dateTo) {
        const endDate =
          new Date(
            dateTo
          );

        if (
          Number.isNaN(
            endDate.getTime()
          )
        ) {
          throw createServiceError(
            400,
            "Date To is invalid."
          );
        }

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        query.createdAt.$lte =
          endDate;
      }
    }

    const normalizedPage =
      normalizePositiveInteger(
        page,
        DEFAULT_PAGE,
        Number.MAX_SAFE_INTEGER
      );

    const normalizedLimit =
      normalizePositiveInteger(
        limit,
        DEFAULT_LIMIT,
        MAX_LIMIT
      );

    const normalizedSortBy =
      DOCUMENT_SORT_FIELDS.includes(
        sortBy
      )
        ? sortBy
        : "createdAt";

    const normalizedSortOrder =
      normalizeLowercaseText(
        sortOrder
      ) === "asc"
        ? 1
        : -1;

    const skip =
      (normalizedPage - 1) *
      normalizedLimit;

    const [
      documents,
      total,
    ] =
      await Promise.all([
        ProjectDocument.find(
          query
        )
          .populate(
            "generatedBy",
            "name email role avatar"
          )
          .sort({
            [normalizedSortBy]:
              normalizedSortOrder,

            _id:
              normalizedSortOrder,
          })
          .skip(skip)
          .limit(
            normalizedLimit
          )
          .lean(),

        ProjectDocument.countDocuments(
          query
        ),
      ]);

    const totalPages =
      Math.max(
        Math.ceil(
          total /
            normalizedLimit
        ),
        1
      );

    return {
      documents:
        documents.map(
          buildDocumentResponse
        ),

      pagination: {
        page:
          normalizedPage,

        limit:
          normalizedLimit,

        total,
        totalPages,

        hasPreviousPage:
          normalizedPage > 1,

        hasNextPage:
          normalizedPage <
          totalPages,
      },
    };
  };

/* =========================================================
   GET PROJECT DOCUMENT HISTORY
   ========================================================= */

export const getProjectDocumentsService =
  async (
    projectId,
    options = {}
  ) => {
    const normalizedProjectId =
      validateMongoId(
        projectId,
        "Project ID"
      );

    await getProjectRecord(
      normalizedProjectId
    );

    return getDocumentsService({
      ...options,

      projectId:
        normalizedProjectId,
    });
  };

/* =========================================================
   GET SINGLE DOCUMENT
   ========================================================= */

export const getDocumentByIdService =
  async (
    documentId
  ) => {
    const normalizedDocumentId =
      validateMongoId(
        documentId,
        "Document ID"
      );

    const document =
      await ProjectDocument.findById(
        normalizedDocumentId
      )
        .populate(
          "generatedBy",
          "name email role avatar"
        )
        .lean();

    if (!document) {
      throw createServiceError(
        404,
        "Document was not found."
      );
    }

    return {
      document:
        buildDocumentResponse(
          document
        ),
    };
  };

/* =========================================================
   DOWNLOAD DOCUMENT
   ========================================================= */

export const getDocumentDownloadService =
  async (
    documentId
  ) => {
    const normalizedDocumentId =
      validateMongoId(
        documentId,
        "Document ID"
      );

    const document =
      await ProjectDocument.findById(
        normalizedDocumentId
      ).lean();

    if (!document) {
      throw createServiceError(
        404,
        "Document was not found."
      );
    }

    if (
      document.status !==
      "completed"
    ) {
      throw createServiceError(
        409,
        "Only completed documents can be downloaded."
      );
    }

    if (
      !document.filePath ||
      !document.fileName
    ) {
      throw createServiceError(
        404,
        "Generated document file is unavailable."
      );
    }

    const cleanFilePath =
      document.filePath
        .replaceAll(
          "\\",
          "/"
        )
        .replace(
          /^\/+/,
          ""
        );

    const absoluteFilePath =
      path.resolve(
        publicDirectory,
        cleanFilePath
      );

    const relativeDocumentPath =
      path.relative(
        documentsDirectory,
        absoluteFilePath
      );

    const isOutsideDirectory =
      relativeDocumentPath.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relativeDocumentPath
      );

    if (isOutsideDirectory) {
      throw createServiceError(
        400,
        "Document file path is invalid."
      );
    }

    try {
      await fs.access(
        absoluteFilePath
      );
    } catch {
      throw createServiceError(
        404,
        "Generated document file was not found."
      );
    }

    return {
      document:
        buildDocumentResponse(
          document
        ),

      absoluteFilePath,
    };
  };

/* =========================================================
   DELETE DOCUMENT HISTORY AND FILE

   Original Project, Tasks and Evidence delete nahi honge.
   ========================================================= */

export const deleteDocumentService =
  async (
    documentId
  ) => {
    const normalizedDocumentId =
      validateMongoId(
        documentId,
        "Document ID"
      );

    const document =
      await ProjectDocument.findById(
        normalizedDocumentId
      );

    if (!document) {
      throw createServiceError(
        404,
        "Document was not found."
      );
    }

    let fileDeleted = false;

    if (document.filePath) {
      const cleanFilePath =
        document.filePath
          .replaceAll(
            "\\",
            "/"
          )
          .replace(
            /^\/+/,
            ""
          );

      const absoluteFilePath =
        path.resolve(
          publicDirectory,
          cleanFilePath
        );

      const relativeDocumentPath =
        path.relative(
          documentsDirectory,
          absoluteFilePath
        );

      const isOutsideDirectory =
        relativeDocumentPath.startsWith(
          ".."
        ) ||
        path.isAbsolute(
          relativeDocumentPath
        );

      if (!isOutsideDirectory) {
        try {
          await fs.unlink(
            absoluteFilePath
          );

          fileDeleted = true;
        } catch (error) {
          if (
            error?.code !==
            "ENOENT"
          ) {
            throw error;
          }
        }
      }
    }

    const deletedDocument =
      buildDocumentResponse(
        document
      );

    await document.deleteOne();

    return {
      document:
        deletedDocument,

      fileDeleted,
    };
  };