import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   PROJECT REFERENCE COUNTER

   Automatic project reference sequence:

   ZSP-000001
   ZSP-000002
   ZSP-000003
   ========================================================= */

const projectReferenceCounterSchema =
  new Schema(
    {
      _id: {
        type: String,

        default:
          "project_reference_number",
      },

      sequence: {
        type: Number,

        required: true,

        default: 0,

        min: 0,
      },
    },
    {
      versionKey: false,

      timestamps: false,

      strict: true,
    }
  );

const ProjectReferenceCounter =
  mongoose.models
    .ProjectReferenceCounter ||
  mongoose.model(
    "ProjectReferenceCounter",
    projectReferenceCounterSchema
  );

/* =========================================================
   GENERATE NEXT PROJECT REFERENCE NUMBER
   ========================================================= */

export const generateProjectReferenceNumber =
  async () => {
    const counter =
      await ProjectReferenceCounter
        .findByIdAndUpdate(
          "project_reference_number",

          {
            $inc: {
              sequence: 1,
            },
          },

          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );

    const sequence =
      String(
        counter.sequence
      ).padStart(
        6,
        "0"
      );

    return `ZSP-${sequence}`;
  };

/* =========================================================
   PROJECT SCHEMA
   ========================================================= */

const projectSchema =
  new Schema(
    {
      /* ===================================================
         AUTOMATIC PROJECT REFERENCE NUMBER

         Database field name projectCode rahega taa-ke
         existing Risk aur frontend compatibility maintain
         rahe.

         Alias:

         project.projectReferenceNo
         project.projectCode

         Dono same value return karenge.
         =================================================== */

      projectCode: {
        type: String,

        alias:
          "projectReferenceNo",

        required: [
          true,
          "Project reference number is required.",
        ],

        unique: true,

        uppercase: true,
        trim: true,

        immutable: true,

        maxlength: [
          50,
          "Project reference number cannot exceed 50 characters.",
        ],
      },

      /* ===================================================
         PROJECT TITLE
         =================================================== */

      title: {
        type: String,

        required: [
          true,
          "Project title is required.",
        ],

        trim: true,

        maxlength: [
          200,
          "Project title cannot exceed 200 characters.",
        ],
      },

      /* ===================================================
         DESCRIPTION
         =================================================== */

      description: {
        type: String,

        default: "",

        trim: true,

        maxlength: [
          2000,
          "Description cannot exceed 2000 characters.",
        ],
      },

      /* ===================================================
         PROJECT TYPE
         =================================================== */

      projectType: {
        type: String,

        enum: {
          values: [
            "electrical_audit",
            "energy_audit",
            "risk_rectification",
            "solar_installation",
            "testing_commissioning",
            "other",
          ],

          message:
            "Invalid project type.",
        },

        default:
          "risk_rectification",

        index: true,
      },

      /* ===================================================
         CLIENT
         =================================================== */

      client: {
        name: {
          type: String,

          required: [
            true,
            "Client name is required.",
          ],

          trim: true,

          maxlength: [
            200,
            "Client name cannot exceed 200 characters.",
          ],
        },

        company: {
          type: String,

          default: "",

          trim: true,

          maxlength: [
            200,
            "Client company cannot exceed 200 characters.",
          ],
        },

        email: {
          type: String,

          default: "",

          lowercase: true,
          trim: true,

          maxlength: [
            320,
            "Client email cannot exceed 320 characters.",
          ],
        },

        phone: {
          type: String,

          default: "",

          trim: true,

          maxlength: [
            50,
            "Client phone cannot exceed 50 characters.",
          ],
        },
      },

      /* ===================================================
         SITE
         =================================================== */

      site: {
        name: {
          type: String,

          required: [
            true,
            "Site name is required.",
          ],

          trim: true,

          maxlength: [
            200,
            "Site name cannot exceed 200 characters.",
          ],
        },

        location: {
          type: String,

          required: [
            true,
            "Site location is required.",
          ],

          trim: true,

          maxlength: [
            500,
            "Site location cannot exceed 500 characters.",
          ],
        },

        city: {
          type: String,

          default: "",

          trim: true,

          maxlength: [
            100,
            "City cannot exceed 100 characters.",
          ],
        },

        province: {
          type: String,

          default: "",

          trim: true,

          maxlength: [
            100,
            "Province cannot exceed 100 characters.",
          ],
        },

        country: {
          type: String,

          default:
            "Pakistan",

          trim: true,

          maxlength: [
            100,
            "Country cannot exceed 100 characters.",
          ],
        },
      },

      /* ===================================================
         SYSTEM CAPACITY
         =================================================== */

      systemCapacityKW: {
        type: Number,

        default: 0,

        min: [
          0,
          "System capacity cannot be negative.",
        ],
      },

      /* ===================================================
         PROJECT DATES
         =================================================== */

      auditDate: {
        type: Date,

        default: null,
      },

      startDate: {
        type: Date,

        required: [
          true,
          "Project start date is required.",
        ],

        index: true,
      },

      expectedCompletionDate: {
        type: Date,

        required: [
          true,
          "Expected completion date is required.",
        ],
      },

      actualCompletionDate: {
        type: Date,

        default: null,
      },

      /* ===================================================
         STATUS
         =================================================== */

      status: {
        type: String,

        enum: {
          values: [
            "draft",
            "active",
            "on_hold",
            "awaiting_verification",
            "completed",
            "archived",
          ],

          message:
            "Invalid project status.",
        },

        default: "draft",

        index: true,
      },

      /* ===================================================
         OVERALL RISK LEVEL

         Index neeche schema.index() se define hai.
         Yahan index:true intentionally nahi hai.
         =================================================== */

      overallRiskLevel: {
        type: String,

        enum: {
          values: [
            "low",
            "medium",
            "high",
            "critical",
            "high_to_critical",
          ],

          message:
            "Invalid overall risk level.",
        },

        default:
          "high_to_critical",
      },

      /* ===================================================
         PROJECT SETTINGS

         Risk Register ID field frontend mein optional hai.

         false:
         Risk Register ID field hidden.

         true:
         Risk Register ID field visible.
         =================================================== */

      settings: {
        riskRegisterIdEnabled: {
          type: Boolean,

          default: false,
        },
      },

      /* ===================================================
         PROGRESS
         =================================================== */

      progress: {
        overall: {
          type: Number,

          default: 0,
          min: 0,
          max: 100,
        },

        rectification: {
          type: Number,

          default: 0,
          min: 0,
          max: 100,
        },

        evidence: {
          type: Number,

          default: 0,
          min: 0,
          max: 100,
        },

        testing: {
          type: Number,

          default: 0,
          min: 0,
          max: 100,
        },

        actionPlan: {
          type: Number,

          default: 0,
          min: 0,
          max: 100,
        },
      },

      /* ===================================================
         RISK SUMMARY
         =================================================== */

      riskSummary: {
        totalRiskGroups: {
          type: Number,

          default: 0,
          min: 0,
        },

        totalEvidence: {
          type: Number,

          default: 0,
          min: 0,
        },

        extreme: {
          type: Number,

          default: 0,
          min: 0,
        },

        high: {
          type: Number,

          default: 0,
          min: 0,
        },

        medium: {
          type: Number,

          default: 0,
          min: 0,
        },

        low: {
          type: Number,

          default: 0,
          min: 0,
        },

        open: {
          type: Number,

          default: 0,
          min: 0,
        },

        inProgress: {
          type: Number,

          default: 0,
          min: 0,
        },

        awaitingVerification: {
          type: Number,

          default: 0,
          min: 0,
        },

        closed: {
          type: Number,

          default: 0,
          min: 0,
        },
      },

      /* ===================================================
         PROJECT TEAM
         =================================================== */

      projectLead: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        default: null,

        index: true,
      },

      teamMembers: [
        {
          type:
            Schema.Types.ObjectId,

          ref: "User",
        },
      ],

      /* ===================================================
         CLIENT ACCESS
         =================================================== */

      clientAccessEnabled: {
        type: Boolean,

        default: true,
      },

      clientAccessToken: {
        type: String,

        unique: true,
        sparse: true,

        select: false,

        default: null,
      },

      clientAccessExpiresAt: {
        type: Date,

        default: null,
      },

      lastClientAccessAt: {
        type: Date,

        default: null,
      },

      /* ===================================================
         NOTES
         =================================================== */

      notes: {
        type: String,

        default: "",

        trim: true,

        maxlength: [
          3000,
          "Notes cannot exceed 3000 characters.",
        ],
      },

      /* ===================================================
         AUDIT FIELDS
         =================================================== */

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: [
          true,
          "Project creator is required.",
        ],

        index: true,
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      strict: true,

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   AUTOMATIC PROJECT REFERENCE NUMBER

   New project create hone par frontend projectCode ya
   projectReferenceNo send nahi karega.

   Backend automatically generate karega.
   ========================================================= */

projectSchema.pre(
  "validate",

  async function generateReferenceNumber() {
    if (!this.isNew) {
      return;
    }

    if (
      typeof this.projectCode ===
        "string" &&
      this.projectCode.trim()
    ) {
      this.projectCode =
        this.projectCode
          .trim()
          .toUpperCase();

      return;
    }

    this.projectCode =
      await generateProjectReferenceNumber();
  }
);

/* =========================================================
   DATE VALIDATION
   ========================================================= */

projectSchema.pre(
  "validate",

  function validateProjectDates() {
    if (
      this.startDate &&
      this.expectedCompletionDate &&
      this.expectedCompletionDate <
        this.startDate
    ) {
      this.invalidate(
        "expectedCompletionDate",

        "Expected completion date cannot be before the project start date."
      );
    }

    if (
      this.actualCompletionDate &&
      this.startDate &&
      this.actualCompletionDate <
        this.startDate
    ) {
      this.invalidate(
        "actualCompletionDate",

        "Actual completion date cannot be before the project start date."
      );
    }
  }
);

/* =========================================================
   NORMALIZE VALUES
   ========================================================= */

projectSchema.pre(
  "validate",

  function normalizeProjectValues() {
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
      this.description =
        this.description.trim();
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
      typeof this.projectType ===
      "string"
    ) {
      this.projectType =
        this.projectType
          .trim()
          .toLowerCase();
    }

    if (
      typeof this.overallRiskLevel ===
      "string"
    ) {
      this.overallRiskLevel =
        this.overallRiskLevel
          .trim()
          .toLowerCase();
    }
  }
);

/* =========================================================
   UPDATE VALIDATION

   Project Reference Number update nahi ho sakta.
   ========================================================= */

projectSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ],

  function configureProjectUpdate() {
    this.setOptions({
      runValidators: true,
      context: "query",
    });

    const update =
      this.getUpdate();

    if (
      !update ||
      Array.isArray(update)
    ) {
      return;
    }

    const updateObject =
      update.$set &&
      typeof update.$set ===
        "object"
        ? update.$set
        : update;

    delete updateObject
      .projectCode;

    delete updateObject
      .projectReferenceNo;

    if (
      update.$unset &&
      typeof update.$unset ===
        "object"
    ) {
      delete update.$unset
        .projectCode;

      delete update.$unset
        .projectReferenceNo;
    }

    if (
      typeof updateObject.title ===
      "string"
    ) {
      updateObject.title =
        updateObject.title.trim();
    }

    if (
      typeof updateObject.description ===
      "string"
    ) {
      updateObject.description =
        updateObject.description.trim();
    }

    if (
      typeof updateObject.status ===
      "string"
    ) {
      updateObject.status =
        updateObject.status
          .trim()
          .toLowerCase();
    }

    if (
      typeof updateObject.projectType ===
      "string"
    ) {
      updateObject.projectType =
        updateObject.projectType
          .trim()
          .toLowerCase();
    }

    if (
      typeof updateObject.overallRiskLevel ===
      "string"
    ) {
      updateObject.overallRiskLevel =
        updateObject.overallRiskLevel
          .trim()
          .toLowerCase();
    }
  }
);

/* =========================================================
   INDEXES
   ========================================================= */

projectSchema.index(
  {
    status: 1,
    createdAt: -1,
  },
  {
    name:
      "project_status_created_at_index",
  }
);

projectSchema.index(
  {
    "client.name": 1,
  },
  {
    name:
      "project_client_name_index",
  }
);

projectSchema.index(
  {
    "site.city": 1,
  },
  {
    name:
      "project_site_city_index",
  }
);

projectSchema.index(
  {
    overallRiskLevel: 1,
  },
  {
    name:
      "project_overall_risk_level_index",
  }
);

projectSchema.index(
  {
    startDate: 1,
    expectedCompletionDate: 1,
  },
  {
    name:
      "project_dates_index",
  }
);

/* =========================================================
   MODEL EXPORT
   ========================================================= */

const Project =
  mongoose.models.Project ||
  mongoose.model(
    "Project",
    projectSchema
  );

export default Project;