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
import Risk from "../../models/risks/risk.model.js";
import Evidence from "../../models/evidences/evidence.model.js";

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
  "risk_register",
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

const RISK_STATUSES = [
  "in_progress",
  "complete",
];

const SORT_ORDERS = [
  "asc",
  "desc",
];

const RISK_SORT_FIELDS = [
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
    ...RISK_STATUSES,
  ].includes(requestedStatus)
    ? requestedStatus
    : "all";

  const requestedSortBy =
    normalizeText(
      filters.sortBy
    );

  const sortBy =
    RISK_SORT_FIELDS.includes(
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

    includeRiskRegisterId:
      normalizeBoolean(
        filters.includeRiskRegisterId,
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

    selectedRiskIds:
      uniqueMongoIds(
        filters.selectedRiskIds
      ),

    sortBy,
    sortOrder,
  };
};

/* =========================================================
   RISK QUERY
   ========================================================= */

const buildRiskQuery = ({
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
    filters.selectedRiskIds
      .length > 0
  ) {
    query._id = {
      $in:
        filters.selectedRiskIds.map(
          (riskId) =>
            new mongoose.Types.ObjectId(
              riskId
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

const groupEvidenceByRisk = (
  evidenceRecords
) => {
  const evidenceMap =
    new Map();

  evidenceRecords.forEach(
    (evidence) => {
      const riskId =
        evidence.riskId.toString();

      if (
        !evidenceMap.has(
          riskId
        )
      ) {
        evidenceMap.set(
          riskId,
          {
            before: [],
            after: [],
          }
        );
      }

      const groupedEvidence =
        evidenceMap.get(
          riskId
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

   Existing Risk List se records fetch honge.

   Koi duplicate Risk create nahi hoga.
   ========================================================= */

const buildExportData = async ({
  projectId,
  filters,
}) => {
  const riskQuery =
    buildRiskQuery({
      projectId,
      filters,
    });

  const sortDirection =
    filters.sortOrder ===
    "desc"
      ? -1
      : 1;

  const risks =
    await Risk.find(
      riskQuery
    )
      .sort({
        [filters.sortBy]:
          sortDirection,

        _id:
          sortDirection,
      })
      .lean();

  if (
    filters.selectedRiskIds
      .length > 0 &&
    risks.length !==
      filters.selectedRiskIds
        .length
  ) {
    throw createServiceError(
      400,
      "One or more selected Risks do not belong to this Project or do not match the selected filters."
    );
  }

  const riskIds =
    risks.map(
      (risk) =>
        risk._id
    );

  const evidenceRecords =
    riskIds.length > 0
      ? await Evidence.find({
          riskId: {
            $in:
              riskIds,
          },
        })
          .sort({
            createdAt: 1,
          })
          .lean()
      : [];

  const evidenceMap =
    groupEvidenceByRisk(
      evidenceRecords
    );

  const rows =
    risks.map(
      (risk) => {
        const groupedEvidence =
          evidenceMap.get(
            risk._id.toString()
          ) || {
            before: [],
            after: [],
          };

        return {
          _id:
            risk._id,

          serialNo:
            risk.serialNo,

          riskRegisterId:
            normalizeText(
              risk.riskRegisterId
            ),

          description:
            normalizeText(
              risk.description
            ),

          status:
            risk.status,

          createdAt:
            risk.createdAt,

          updatedAt:
            risk.updatedAt,

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

  const totalRisks =
    rows.length;

  const inProgressRisks =
    rows.filter(
      (row) =>
        row.status ===
        "in_progress"
    ).length;

  const completeRisks =
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
    totalRisks > 0
      ? Number(
          (
            (completeRisks /
              totalRisks) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    rows,

    exportedRiskIds:
      riskIds,

    summary: {
      totalRisks,
      inProgressRisks,
      completeRisks,
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

  if (
    imagePath.startsWith(
      "http://"
    ) ||
    imagePath.startsWith(
      "https://"
    )
  ) {
    return "";
  }

  const cleanImagePath =
    imagePath
      .trim()
      .replaceAll(
        "\\",
        "/"
      )
      .replace(
        /^\/+/,
        ""
      );

  const absoluteImagePath =
    path.resolve(
      publicDirectory,
      cleanImagePath
    );

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

  if (isOutsidePublic) {
    return "";
  }

  return absoluteImagePath;
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
    const absoluteImagePath =
      getLocalImagePath(
        imagePath
      );

    if (!absoluteImagePath) {
      return null;
    }

    try {
      const extension =
        path
          .extname(
            absoluteImagePath
          )
          .toLowerCase();

      if (
        !SUPPORTED_IMAGE_EXTENSIONS.includes(
          extension
        )
      ) {
        return null;
      }

      const fileBuffer =
        await fs.readFile(
          absoluteImagePath
        );

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
        } catch {
          return null;
        }
      }

      return null;
    } catch {
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
              "risk_register"
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
                "Project Risk Report",

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
          .font(
            "Helvetica-Bold"
          )
          .fontSize(20)
          .fillColor(
            "#111827"
          )
          .text(
            title,
            {
              align:
                "center",
            }
          );

        pdf
          .moveDown(0.4)
          .font(
            "Helvetica"
          )
          .fontSize(10)
          .fillColor(
            "#4B5563"
          )
          .text(
            `${projectTitle} | ${projectCode}`,
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

          if (project?.status) {
            pdf.text(
              `Project Status: ${project.status}`
            );
          }

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
            `Total Risks: ${summary.totalRisks}`
          )
          .text(
            `In Progress: ${summary.inProgressRisks}`
          )
          .text(
            `Complete: ${summary.completeRisks}`
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
              "No matching Risk records were found."
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
                `Sr. No. ${row.serialNo}`
              );

            if (
              filters.includeRiskRegisterId &&
              row.riskRegisterId
            ) {
              pdf
                .font(
                  "Helvetica"
                )
                .fontSize(9)
                .fillColor(
                  "#4B5563"
                )
                .text(
                  `Risk Register ID: ${row.riskRegisterId}`
                );
            }

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
              layout !==
                "detailed_evidence" ||
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

                    const localPath =
                      getLocalImagePath(
                        evidence.imagePath
                      );

                    if (
                      localPath &&
                      fsSync.existsSync(
                        localPath
                      ) &&
                      !localPath
                        .toLowerCase()
                        .endsWith(
                          ".webp"
                        )
                    ) {
                      try {
                        pdf.image(
                          localPath,
                          {
                            fit: [
                              420,
                              210,
                            ],

                            align:
                              "center",
                          }
                        );
                      } catch {
                        pdf.text(
                          evidence.imagePath
                        );
                      }
                    } else {
                      pdf.text(
                        evidence.imagePath ||
                          "Image unavailable"
                      );
                    }

                    pdf.moveDown(
                      0.5
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
      HeadingLevel,
      ImageRun,
      Packer,
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
        })
      );

      if (project?.status) {
        children.push(
          new Paragraph({
            text:
              `Project Status: ${project.status}`,
          })
        );
      }
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
              "Total Risks",
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
              summary.totalRisks,
              summary.inProgressRisks,
              summary.completeRisks,
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
          "Risk Register",
      })
    );

    const headerCells = [
      "Sr. No.",

      ...(filters.includeRiskRegisterId
        ? [
            "Risk Register ID",
          ]
        : []),

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
              row.serialNo,

              ...(filters.includeRiskRegisterId
                ? [
                    row.riskRegisterId ||
                      "—",
                  ]
                : []),

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
      layout ===
        "detailed_evidence" &&
      filters.includeEvidenceImages
    ) {
      for (const row of rows) {
        children.push(
          new Paragraph({
            heading:
              HeadingLevel.HEADING_2,

            text:
              `Sr. No. ${row.serialNo}`,
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
                        width: 420,
                        height: 260,
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
                    "risk_register"
                      ? PageOrientation.LANDSCAPE
                      : PageOrientation.PORTRAIT,
                },
              },
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
          "Total Risks",

        value:
          summary.totalRisks,
      },

      {
        field:
          "In Progress",

        value:
          summary.inProgressRisks,
      },

      {
        field:
          "Complete",

        value:
          summary.completeRisks,
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

    const riskSheet =
      workbook.addWorksheet(
        "Risk Register"
      );

    riskSheet.columns = [
      {
        header:
          "Sr. No.",

        key:
          "serialNo",

        width: 12,
      },

      ...(filters.includeRiskRegisterId
        ? [
            {
              header:
                "Risk Register ID",

              key:
                "riskRegisterId",

              width: 22,
            },
          ]
        : []),

      {
        header:
          "Description",

        key:
          "description",

        width: 70,
      },

      {
        header:
          "Before Evidence",

        key:
          "beforeCount",

        width: 18,
      },

      {
        header:
          "After Evidence",

        key:
          "afterCount",

        width: 18,
      },

      {
        header:
          "Status",

        key:
          "status",

        width: 18,
      },

      {
        header:
          "Created At",

        key:
          "createdAt",

        width: 18,
      },

      {
        header:
          "Updated At",

        key:
          "updatedAt",

        width: 18,
      },
    ];

    rows.forEach(
      (row) => {
        riskSheet.addRow({
          serialNo:
            row.serialNo,

          ...(filters.includeRiskRegisterId
            ? {
                riskRegisterId:
                  row.riskRegisterId ||
                  "",
              }
            : {}),

          description:
            row.description,

          beforeCount:
            row.beforeCount,

          afterCount:
            row.afterCount,

          status:
            getStatusLabel(
              row.status
            ),

          createdAt:
            row.createdAt
              ? new Date(
                  row.createdAt
                )
              : "",

          updatedAt:
            row.updatedAt
              ? new Date(
                  row.updatedAt
                )
              : "",
        });
      }
    );

    riskSheet.getRow(
      1
    ).font = {
      bold: true,
    };

    riskSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    riskSheet.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },

      to: {
        row: 1,
        column:
          riskSheet.columns.length,
      },
    };

    riskSheet.eachRow(
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
          "Risk Register ID",

        key:
          "riskRegisterId",

        width: 22,
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
              row.serialNo,

            riskRegisterId:
              row.riskRegisterId ||
              "",

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

    const title =
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
      "risk_register";

    const format =
      normalizeLowercaseText(
        payload?.format
      );

    if (
      title.length < 3 ||
      title.length > 250
    ) {
      throw createServiceError(
        400,
        "Report title must contain between 3 and 250 characters."
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

    const {
      project,
      projectCode,
      projectTitle,
    } =
      await getProjectRecord(
        projectId
      );

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

      const fileName =
        createGeneratedFileName(
          title,
          format
        );

      outputPath =
        path.resolve(
          projectDirectory,
          fileName
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

      documentRecord.exportedRiskIds =
        exportData.exportedRiskIds;

      documentRecord.summary =
        exportData.summary;

      documentRecord.fileName =
        fileName;

      documentRecord.filePath =
        createPublicFilePath(
          projectId,
          fileName
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

   Original Project, Risks and Evidence delete nahi honge.
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