import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   DOCUMENT LAYOUTS

   Layout internal report structure control karega.
   Visible report title user apni marzi se enter karega.
   ========================================================= */

export const DOCUMENT_LAYOUTS = [
  "task_register",
  "detailed_evidence",
  "summary",
];

/* =========================================================
   EXPORT FORMATS
   ========================================================= */

export const DOCUMENT_FORMATS = [
  "pdf",
  "docx",
  "xlsx",
];

/* =========================================================
   GENERATION STATUSES
   ========================================================= */

export const DOCUMENT_STATUSES = [
  "generating",
  "completed",
  "failed",
];

/* =========================================================
   TASK STATUS FILTERS
   ========================================================= */

export const DOCUMENT_TASK_STATUS_FILTERS = [
  "all",
  "in_progress",
  "complete",
];

/* =========================================================
   MIME TYPES
   ========================================================= */

export const DOCUMENT_MIME_TYPES = {
  pdf: "application/pdf",

  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  xlsx:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/* =========================================================
   REPORT FILTERS

   Yeh record karega ke report generate karte waqt kaun se
   Task records aur Evidence options select kiye gaye thay.
   ========================================================= */

const documentFiltersSchema =
  new Schema(
    {
      statusFilter: {
        type: String,

        enum: {
          values:
            DOCUMENT_TASK_STATUS_FILTERS,

          message:
            "Status filter must be all, in_progress or complete.",
        },

        default: "all",
      },

      includeProjectDetails: {
        type: Boolean,

        default: true,
      },

      includeBeforeEvidence: {
        type: Boolean,

        default: true,
      },

      includeAfterEvidence: {
        type: Boolean,

        default: true,
      },

      includeEvidenceImages: {
        type: Boolean,

        default: true,
      },

      dateFrom: {
        type: Date,

        default: undefined,
      },

      dateTo: {
        type: Date,

        default: undefined,
      },

      /*
        Specific Tasks select kiye jayen to unke IDs save honge.

        Empty array ka matlab:
        Project ke tamam matching Tasks export honge.
      */

      selectedTaskIds: {
        type: [
          {
            type:
              Schema.Types.ObjectId,

            ref: "Task",
          },
        ],

        default: [],
      },

      sortBy: {
        type: String,

        enum: {
          values: [
            "serialNo",
            "createdAt",
            "updatedAt",
            "status",
          ],

          message:
            "Sort field must be serialNo, createdAt, updatedAt or status.",
        },

        default:
          "serialNo",
      },

      sortOrder: {
        type: String,

        enum: {
          values: [
            "asc",
            "desc",
          ],

          message:
            "Sort order must be asc or desc.",
        },

        default: "asc",
      },
    },
    {
      _id: false,

      strict: true,
    }
  );

/* =========================================================
   REPORT SUMMARY SNAPSHOT

   Report generation ke waqt jo counts thay woh history
   record mein preserve rahenge.
   ========================================================= */

const documentSummarySchema =
  new Schema(
    {
      totalTasks: {
        type: Number,

        min: [
          0,
          "Total Tasks cannot be negative.",
        ],

        default: 0,
      },

      inProgressTasks: {
        type: Number,

        min: [
          0,
          "In Progress Tasks cannot be negative.",
        ],

        default: 0,
      },

      completeTasks: {
        type: Number,

        min: [
          0,
          "Complete Tasks cannot be negative.",
        ],

        default: 0,
      },

      beforeEvidenceCount: {
        type: Number,

        min: [
          0,
          "Before Evidence count cannot be negative.",
        ],

        default: 0,
      },

      afterEvidenceCount: {
        type: Number,

        min: [
          0,
          "After Evidence count cannot be negative.",
        ],

        default: 0,
      },

      totalEvidenceCount: {
        type: Number,

        min: [
          0,
          "Total Evidence count cannot be negative.",
        ],

        default: 0,
      },

      completionPercentage: {
        type: Number,

        min: [
          0,
          "Completion percentage cannot be negative.",
        ],

        max: [
          100,
          "Completion percentage cannot exceed 100.",
        ],

        default: 0,
      },
    },
    {
      _id: false,

      strict: true,
    }
  );

/* =========================================================
   PROJECT DOCUMENT MODEL
   ========================================================= */

const documentSchema =
  new Schema(
    {
      /* =====================================================
         PROJECT REFERENCE
         ===================================================== */

      projectId: {
        type:
          Schema.Types.ObjectId,

        ref: "Project",

        required: [
          true,
          "Project ID is required.",
        ],

        immutable: true,

        index: true,
      },

      /*
        Existing backend compatibility ke liye database field
        ka naam projectCode rahega.

        UI mein isay Project Reference Number display kiya jayega.
      */

      projectCode: {
        type: String,

        required: [
          true,
          "Project Reference Number is required.",
        ],

        trim: true,

        uppercase: true,

        minlength: [
          1,
          "Project Reference Number is required.",
        ],

        maxlength: [
          100,
          "Project Reference Number cannot exceed 100 characters.",
        ],

        immutable: true,

        index: true,
      },

      /*
        Project title ka snapshot save hoga.

        Project ka naam future mein change ho jaye tab bhi
        historical report ka original project title preserve
        rahega.
      */

      projectTitle: {
        type: String,

        required: [
          true,
          "Project title is required.",
        ],

        trim: true,

        minlength: [
          2,
          "Project title must contain at least 2 characters.",
        ],

        maxlength: [
          250,
          "Project title cannot exceed 250 characters.",
        ],

        immutable: true,
      },

      /* =====================================================
         CUSTOM REPORT INFORMATION

         Report title fixed nahi hai.

         Examples:

         Electrical Safety Working Report
         August Progress Report
         Final Site Task Register
         Client Submission Report
         ===================================================== */

      title: {
        type: String,

        required: [
          true,
          "Report title is required.",
        ],

        trim: true,

        minlength: [
          3,
          "Report title must contain at least 3 characters.",
        ],

        maxlength: [
          250,
          "Report title cannot exceed 250 characters.",
        ],

        index: true,
      },

      description: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Report description cannot exceed 2000 characters.",
        ],

        default:
          undefined,
      },

      /*
        Layout sirf generated file ki internal structure
        control karega.

        Yeh report ka visible title nahi hai.
      */

      layout: {
        type: String,

        required: [
          true,
          "Report layout is required.",
        ],

        enum: {
          values:
            DOCUMENT_LAYOUTS,

          message:
            "Report layout must be task_register, detailed_evidence or summary.",
        },

        default:
          "task_register",

        index: true,
      },

      format: {
        type: String,

        required: [
          true,
          "Export format is required.",
        ],

        enum: {
          values:
            DOCUMENT_FORMATS,

          message:
            "Export format must be PDF, DOCX or XLSX.",
        },

        lowercase: true,

        immutable: true,

        index: true,
      },

      status: {
        type: String,

        required: [
          true,
          "Document status is required.",
        ],

        enum: {
          values:
            DOCUMENT_STATUSES,

          message:
            "Document status must be generating, completed or failed.",
        },

        default:
          "generating",

        index: true,
      },

      /* =====================================================
         EXPORT FILTERS
         ===================================================== */

      filters: {
        type:
          documentFiltersSchema,

        default:
          () => ({}),
      },

      /* =====================================================
         EXPORTED TASK REFERENCES

         Task data duplicate save nahi hoga.

         Sirf exported Task IDs history/reference ke liye
         store hongi.
         ===================================================== */

      exportedTaskIds: {
        type: [
          {
            type:
              Schema.Types.ObjectId,

            ref: "Task",
          },
        ],

        default: [],
      },

      /* =====================================================
         REPORT SUMMARY SNAPSHOT
         ===================================================== */

      summary: {
        type:
          documentSummarySchema,

        default:
          () => ({}),
      },

      /* =====================================================
         GENERATED FILE INFORMATION
         ===================================================== */

      fileName: {
        type: String,

        trim: true,

        maxlength: [
          300,
          "Document file name cannot exceed 300 characters.",
        ],

        default:
          undefined,

        validate: {
          validator(value) {
            if (!value) {
              return true;
            }

            return (
              typeof value ===
                "string" &&
              !value.includes("/") &&
              !value.includes("\\") &&
              /\.(pdf|docx|xlsx)$/i.test(
                value
              )
            );
          },

          message:
            "Document file name is invalid.",
        },
      },

      /*
        Example:

        /uploads/documents/PROJECT_ID/report-name.pdf
      */

      filePath: {
        type: String,

        trim: true,

        default:
          undefined,

        validate: [
          {
            validator(value) {
              if (!value) {
                return true;
              }

              return (
                typeof value ===
                  "string" &&
                /^\/uploads\/documents\/[^/]+\/[^/]+\.(pdf|docx|xlsx)$/i.test(
                  value
                )
              );
            },

            message:
              "Document file path must be inside the Documents uploads folder.",
          },

          {
            validator(value) {
              if (!value) {
                return true;
              }

              return (
                typeof value ===
                  "string" &&
                !value.includes(
                  ".."
                )
              );
            },

            message:
              "Document file path is invalid.",
          },
        ],
      },

      mimeType: {
        type: String,

        trim: true,

        default:
          undefined,

        enum: {
          values: [
            DOCUMENT_MIME_TYPES.pdf,
            DOCUMENT_MIME_TYPES.docx,
            DOCUMENT_MIME_TYPES.xlsx,
          ],

          message:
            "Document MIME type is invalid.",
        },
      },

      fileSize: {
        type: Number,

        min: [
          0,
          "Document file size cannot be negative.",
        ],

        default:
          undefined,
      },

      generatedAt: {
        type: Date,

        default:
          undefined,

        index: true,
      },

      /* =====================================================
         GENERATED BY USER
         ===================================================== */

      generatedBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: [
          true,
          "Generated By user is required.",
        ],

        immutable: true,

        index: true,
      },

      /* =====================================================
         FAILED GENERATION DETAILS
         ===================================================== */

      failureReason: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Failure reason cannot exceed 2000 characters.",
        ],

        default:
          undefined,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      strict: true,

      collection:
        "project_documents",
    }
  );

/* =========================================================
   NORMALIZE DOCUMENT
   ========================================================= */

documentSchema.pre(
  "validate",
  function normalizeDocument() {
    if (
      typeof this.projectCode ===
      "string"
    ) {
      this.projectCode =
        this.projectCode
          .trim()
          .toUpperCase();
    }

    if (
      typeof this.projectTitle ===
      "string"
    ) {
      this.projectTitle =
        this.projectTitle
          .trim();
    }

    if (
      typeof this.title ===
      "string"
    ) {
      this.title =
        this.title.trim();
    }

    if (
      typeof this.description ===
      "string"
    ) {
      const normalizedDescription =
        this.description.trim();

      this.description =
        normalizedDescription ||
        undefined;
    }

    if (
      typeof this.layout ===
      "string"
    ) {
      this.layout =
        this.layout
          .trim()
          .toLowerCase();
    }

    if (
      typeof this.format ===
      "string"
    ) {
      this.format =
        this.format
          .trim()
          .toLowerCase();
    }

    if (
      typeof this.status ===
      "string"
    ) {
      this.status =
        this.status
          .trim()
          .toLowerCase();
    }

    if (
      typeof this.fileName ===
      "string"
    ) {
      const normalizedFileName =
        this.fileName.trim();

      this.fileName =
        normalizedFileName ||
        undefined;
    }

    if (
      typeof this.filePath ===
      "string"
    ) {
      let normalizedFilePath =
        this.filePath
          .trim()
          .replaceAll(
            "\\",
            "/"
          );

      if (
        normalizedFilePath &&
        !normalizedFilePath.startsWith(
          "/"
        )
      ) {
        normalizedFilePath =
          `/${normalizedFilePath}`;
      }

      this.filePath =
        normalizedFilePath ||
        undefined;
    }

    if (
      typeof this.mimeType ===
      "string"
    ) {
      const normalizedMimeType =
        this.mimeType.trim();

      this.mimeType =
        normalizedMimeType ||
        undefined;
    }

    if (
      typeof this.failureReason ===
      "string"
    ) {
      const normalizedFailureReason =
        this.failureReason.trim();

      this.failureReason =
        normalizedFailureReason ||
        undefined;
    }

    /*
      Duplicate Task references remove hongi.
    */

    if (
      Array.isArray(
        this.exportedTaskIds
      )
    ) {
      this.exportedTaskIds = [
        ...new Map(
          this.exportedTaskIds.map(
            (taskId) => [
              taskId.toString(),
              taskId,
            ]
          )
        ).values(),
      ];
    }

    if (
      Array.isArray(
        this.filters
          ?.selectedTaskIds
      )
    ) {
      this.filters.selectedTaskIds = [
        ...new Map(
          this.filters.selectedTaskIds.map(
            (taskId) => [
              taskId.toString(),
              taskId,
            ]
          )
        ).values(),
      ];
    }
  }
);

/* =========================================================
   DATE FILTER VALIDATION
   ========================================================= */

documentSchema.pre(
  "validate",
  function validateDateFilters() {
    const dateFrom =
      this.filters?.dateFrom;

    const dateTo =
      this.filters?.dateTo;

    if (
      dateFrom &&
      dateTo &&
      new Date(dateFrom) >
        new Date(dateTo)
    ) {
      this.invalidate(
        "filters.dateTo",
        "Date To must be equal to or later than Date From."
      );
    }
  }
);

/* =========================================================
   SUMMARY CALCULATION
   ========================================================= */

documentSchema.pre(
  "validate",
  function normalizeSummary() {
    if (!this.summary) {
      return;
    }

    const beforeCount =
      Number(
        this.summary
          .beforeEvidenceCount ||
          0
      );

    const afterCount =
      Number(
        this.summary
          .afterEvidenceCount ||
          0
      );

    this.summary.totalEvidenceCount =
      beforeCount +
      afterCount;

    const totalTasks =
      Number(
        this.summary
          .totalTasks ||
          0
      );

    const completeTasks =
      Number(
        this.summary
          .completeTasks ||
          0
      );

    this.summary.completionPercentage =
      totalTasks > 0
        ? Number(
            (
              (completeTasks /
                totalTasks) *
              100
            ).toFixed(2)
          )
        : 0;
  }
);

/* =========================================================
   COMPLETED DOCUMENT VALIDATION
   ========================================================= */

documentSchema.pre(
  "validate",
  function validateCompletedDocument() {
    if (
      this.status !==
      "completed"
    ) {
      return;
    }

    if (!this.fileName) {
      this.invalidate(
        "fileName",
        "Completed document file name is required."
      );
    }

    if (!this.filePath) {
      this.invalidate(
        "filePath",
        "Completed document file path is required."
      );
    }

    if (!this.mimeType) {
      this.invalidate(
        "mimeType",
        "Completed document MIME type is required."
      );
    }

    if (
      !Number.isFinite(
        Number(
          this.fileSize
        )
      )
    ) {
      this.invalidate(
        "fileSize",
        "Completed document file size is required."
      );
    }

    if (!this.generatedAt) {
      this.invalidate(
        "generatedAt",
        "Completed document generation date is required."
      );
    }

    const expectedMimeType =
      DOCUMENT_MIME_TYPES[
        this.format
      ];

    if (
      expectedMimeType &&
      this.mimeType &&
      this.mimeType !==
        expectedMimeType
    ) {
      this.invalidate(
        "mimeType",
        `MIME type does not match the ${this.format.toUpperCase()} format.`
      );
    }

    const expectedExtension =
      `.${this.format}`;

    if (
      this.fileName &&
      !this.fileName
        .toLowerCase()
        .endsWith(
          expectedExtension
        )
    ) {
      this.invalidate(
        "fileName",
        `File name must end with ${expectedExtension}.`
      );
    }

    if (
      this.filePath &&
      !this.filePath
        .toLowerCase()
        .endsWith(
          expectedExtension
        )
    ) {
      this.invalidate(
        "filePath",
        `File path must end with ${expectedExtension}.`
      );
    }
  }
);

/* =========================================================
   FAILED DOCUMENT VALIDATION
   ========================================================= */

documentSchema.pre(
  "validate",
  function validateFailedDocument() {
    if (
      this.status !==
      "failed"
    ) {
      return;
    }

    if (!this.failureReason) {
      this.invalidate(
        "failureReason",
        "Failure reason is required for a failed document."
      );
    }
  }
);

/* =========================================================
   PROJECT DOCUMENT HISTORY INDEX
   ========================================================= */

documentSchema.index(
  {
    projectId: 1,
    createdAt: -1,
  },
  {
    name:
      "project_document_history_index",
  }
);

/* =========================================================
   PROJECT FORMAT HISTORY INDEX
   ========================================================= */

documentSchema.index(
  {
    projectId: 1,
    format: 1,
    createdAt: -1,
  },
  {
    name:
      "project_document_format_history_index",
  }
);

/* =========================================================
   PROJECT LAYOUT HISTORY INDEX
   ========================================================= */

documentSchema.index(
  {
    projectId: 1,
    layout: 1,
    createdAt: -1,
  },
  {
    name:
      "project_document_layout_history_index",
  }
);

/* =========================================================
   DOCUMENT STATUS INDEX
   ========================================================= */

documentSchema.index(
  {
    status: 1,
    createdAt: -1,
  },
  {
    name:
      "document_status_history_index",
  }
);

/* =========================================================
   GENERATED USER HISTORY INDEX
   ========================================================= */

documentSchema.index(
  {
    generatedBy: 1,
    createdAt: -1,
  },
  {
    name:
      "generated_user_document_history_index",
  }
);

/* =========================================================
   JSON RESPONSE
   ========================================================= */

documentSchema.set(
  "toJSON",
  {
    transform(
      _document,
      returnedObject
    ) {
      returnedObject.projectReferenceNo =
        returnedObject.projectCode;

      return returnedObject;
    },
  }
);

/* =========================================================
   MODEL EXPORT
   ========================================================= */

const ProjectDocument =
  mongoose.models
    .ProjectDocument ||
  mongoose.model(
    "ProjectDocument",
    documentSchema
  );

export default ProjectDocument;