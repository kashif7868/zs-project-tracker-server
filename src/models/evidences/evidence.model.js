import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   TASK EVIDENCE MODEL

   Canonical application terminology:

   projectId
   projectCode
   taskId
   taskRegisterId optional
   evidenceType
   imagePath

   IMPORTANT MIGRATION COMPATIBILITY:

   Existing MongoDB collection:
   risk_evidences

   Existing physical DB fields:
   riskId
   riskRegisterId

   Existing image folders:
   /uploads/risks/before/
   /uploads/risks/after/

   These physical names are temporarily preserved so existing
   evidence records and image files do not break.

   New application code can use:
   taskId
   taskRegisterId
   ========================================================= */

const evidenceSchema =
  new Schema(
    {
      /* =====================================================
         PROJECT ID
         ===================================================== */

      projectId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Project",

        required: [
          true,
          "Project ID is required.",
        ],

        immutable: true,

        index: true,
      },

      /* =====================================================
         PROJECT REFERENCE NUMBER
         ===================================================== */

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

      /* =====================================================
         TASK REFERENCE

         Canonical property:
         taskId

         Existing physical MongoDB field:
         riskId

         Alias keeps old evidence records compatible.
         ===================================================== */

      riskId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Task",

        alias:
          "taskId",

        required: [
          true,
          "Task ID is required.",
        ],

        immutable: true,

        index: true,
      },

      /* =====================================================
         TASK REGISTER ID

         Canonical property:
         taskRegisterId

         Existing physical MongoDB field:
         riskRegisterId
         ===================================================== */

      riskRegisterId: {
        type: String,

        alias:
          "taskRegisterId",

        required: false,

        default: undefined,

        trim: true,
        uppercase: true,

        maxlength: [
          100,
          "Task Register ID cannot exceed 100 characters.",
        ],

        index: true,
      },

      /* =====================================================
         EVIDENCE TYPE
         ===================================================== */

      evidenceType: {
        type: String,

        required: [
          true,
          "Evidence type is required.",
        ],

        enum: {
          values: [
            "before",
            "after",
          ],

          message:
            "Evidence type must be before or after.",
        },

        immutable: true,

        index: true,
      },

      /* =====================================================
         IMAGE PATH

         Canonical locations for NEW Evidence records:

         /uploads/tasks/before/...
         /uploads/tasks/after/...

         Existing database records that already contain
         /uploads/risks/... remain readable during migration,
         but new records cannot use the legacy folder.
         ===================================================== */

      imagePath: {
        type: String,

        required: [
          true,
          "Evidence image path is required.",
        ],

        trim: true,

        immutable: true,

        validate: [
          {
            validator(value) {
              return (
                typeof value ===
                  "string" &&
                /^\/uploads\/tasks\/(before|after)\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(
                  value
                )
              );
            },

            message:
              "Evidence must be a JPG, JPEG, PNG or WEBP image inside the Task evidence uploads folder.",
          },

          {
            validator(value) {
              return (
                typeof value ===
                  "string" &&
                !value.includes("..")
              );
            },

            message:
              "Evidence image path is invalid.",
          },
        ],
      },
    },
    {
      timestamps: true,

      versionKey: false,

      strict: true,

      /*
        Existing MongoDB collection preserved.
      */
      collection:
        "risk_evidences",

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   NORMALIZE DATA
   ========================================================= */

evidenceSchema.pre(
  "validate",
  function normalizeEvidence() {
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
      typeof this.riskRegisterId ===
      "string"
    ) {
      const normalizedTaskRegisterId =
        this.riskRegisterId
          .trim()
          .toUpperCase();

      this.riskRegisterId =
        normalizedTaskRegisterId ||
        undefined;
    }

    if (
      typeof this.evidenceType ===
      "string"
    ) {
      this.evidenceType =
        this.evidenceType
          .trim()
          .toLowerCase();
    }

    if (
      typeof this.imagePath ===
      "string"
    ) {
      let normalizedImagePath =
        this.imagePath
          .trim()
          .replaceAll(
            "\\",
            "/"
          );

      if (
        normalizedImagePath &&
        !normalizedImagePath.startsWith(
          "/"
        )
      ) {
        normalizedImagePath =
          `/${normalizedImagePath}`;
      }

      this.imagePath =
        normalizedImagePath;
    }
  }
);

/* =========================================================
   BEFORE / AFTER FOLDER VALIDATION

   All NEW Evidence records must point to the canonical Task
   Evidence folders:

   /uploads/tasks/before/
   /uploads/tasks/after/

   IMPORTANT:
   Existing legacy MongoDB records containing /uploads/risks
   are not rewritten by this model. They remain readable.
   ========================================================= */

evidenceSchema.pre(
  "validate",
  function validateEvidenceFolder() {
    if (
      !this.evidenceType ||
      !this.imagePath
    ) {
      return;
    }

    const taskFolder =
      `/uploads/tasks/${this.evidenceType}/`;

    if (
      !this.imagePath.startsWith(
        taskFolder
      )
    ) {
      this.invalidate(
        "imagePath",
        `${this.evidenceType} Evidence image must be stored inside ${taskFolder}`
      );
    }
  }
);

/* =========================================================
   QUERY UPDATE VALIDATION
   ========================================================= */

evidenceSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ],
  function configureUpdateValidation() {
    this.setOptions({
      runValidators: true,
      context: "query",
    });
  }
);

/* =========================================================
   QUERY UPDATE NORMALIZATION

   New code may send taskRegisterId.
   Existing physical field remains riskRegisterId.
   ========================================================= */

evidenceSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ],
  function normalizeEvidenceUpdate() {
    const update =
      this.getUpdate();

    if (!update) {
      return;
    }

    const directUpdate =
      update.$set ||
      update;

    if (
      Object.prototype
        .hasOwnProperty.call(
          directUpdate,
          "taskRegisterId"
        )
    ) {
      directUpdate.riskRegisterId =
        directUpdate.taskRegisterId;

      delete directUpdate
        .taskRegisterId;
    }

    if (
      typeof directUpdate
        .projectCode ===
      "string"
    ) {
      directUpdate.projectCode =
        directUpdate.projectCode
          .trim()
          .toUpperCase();
    }

    if (
      typeof directUpdate
        .riskRegisterId ===
      "string"
    ) {
      const normalizedTaskRegisterId =
        directUpdate.riskRegisterId
          .trim()
          .toUpperCase();

      if (
        normalizedTaskRegisterId
      ) {
        directUpdate.riskRegisterId =
          normalizedTaskRegisterId;
      } else {
        delete directUpdate
          .riskRegisterId;

        update.$unset = {
          ...(update.$unset ||
            {}),

          riskRegisterId: "",
        };
      }
    }

    if (
      directUpdate
        .riskRegisterId ===
      null
    ) {
      delete directUpdate
        .riskRegisterId;

      update.$unset = {
        ...(update.$unset ||
          {}),

        riskRegisterId: "",
      };
    }

    this.setUpdate(update);
  }
);

/* =========================================================
   PREVENT DUPLICATE IMAGE RECORD

   Physical DB field riskId preserved.
   ========================================================= */

evidenceSchema.index(
  {
    riskId: 1,
    evidenceType: 1,
    imagePath: 1,
  },
  {
    unique: true,

    name:
      "unique_risk_evidence_image",
  }
);

/* =========================================================
   TASK EVIDENCE FETCH INDEX

   Existing index keys/names are preserved where practical so
   current database deployment remains safe.
   ========================================================= */

evidenceSchema.index(
  {
    riskId: 1,
    evidenceType: 1,
    createdAt: 1,
  },
  {
    name:
      "risk_evidence_type_index",
  }
);

/* =========================================================
   PROJECT TASK EVIDENCE INDEX
   ========================================================= */

evidenceSchema.index(
  {
    projectId: 1,
    riskId: 1,
    createdAt: -1,
  },
  {
    name:
      "project_risk_evidence_index",
  }
);

/* =========================================================
   JSON RESPONSE

   Canonical response exposes:
   taskId
   taskRegisterId

   Legacy keys remain temporarily available during migration.
   ========================================================= */

evidenceSchema.set(
  "toJSON",
  {
    virtuals: true,

    transform(
      _document,
      returnedObject
    ) {
      delete returnedObject.__v;

      returnedObject.taskId =
        returnedObject.taskId ||
        returnedObject.riskId;

      returnedObject.taskRegisterId =
        returnedObject.taskRegisterId ||
        returnedObject.riskRegisterId ||
        undefined;

      return returnedObject;
    },
  }
);

/* =========================================================
   MODEL EXPORT

   Application model:
   Evidence

   Existing MongoDB collection:
   risk_evidences

   Existing Mongoose model name RiskEvidence may already exist
   during hot reload, so both names are handled safely.
   ========================================================= */

const Evidence =
  mongoose.models
    .TaskEvidence ||
  mongoose.models
    .RiskEvidence ||
  mongoose.model(
    "TaskEvidence",
    evidenceSchema,
    "risk_evidences"
  );

export default Evidence;
