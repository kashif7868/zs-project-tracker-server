import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   EVIDENCE MODEL

   Locked fields:

   projectId
   projectCode
   riskId
   riskRegisterId
   evidenceType
   imagePath

   Sirf images:

   JPG
   JPEG
   PNG
   WEBP
   ========================================================= */

const evidenceSchema = new Schema(
  {
    /* =====================================================
       PROJECT REFERENCE
       ===================================================== */

    projectId: {
      type: Schema.Types.ObjectId,

      ref: "Project",

      required: [
        true,
        "Project ID is required.",
      ],

      index: true,
    },

    /* =====================================================
       PROJECT CODE

       Risk ke selected Project se fetch hoga.
       ===================================================== */

    projectCode: {
      type: String,

      required: [
        true,
        "Project code is required.",
      ],

      trim: true,

      uppercase: true,

      minlength: [
        1,
        "Project code is required.",
      ],

      maxlength: [
        100,
        "Project code cannot exceed 100 characters.",
      ],

      index: true,
    },

    /* =====================================================
       RISK REFERENCE
       ===================================================== */

    riskId: {
      type: Schema.Types.ObjectId,

      ref: "Risk",

      required: [
        true,
        "Risk ID is required.",
      ],

      index: true,
    },

    /* =====================================================
       RISK REGISTER ID
       ===================================================== */

    riskRegisterId: {
      type: String,

      required: [
        true,
        "Risk Register ID is required.",
      ],

      trim: true,

      uppercase: true,

      minlength: [
        1,
        "Risk Register ID is required.",
      ],

      maxlength: [
        100,
        "Risk Register ID cannot exceed 100 characters.",
      ],

      index: true,
    },

    /* =====================================================
       EVIDENCE TYPE

       before
       after
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

      index: true,
    },

    /* =====================================================
       IMAGE PATH

       Examples:

       /uploads/risks/before/before-image.jpg
       /uploads/risks/after/after-image.png
       ===================================================== */

    imagePath: {
      type: String,

      required: [
        true,
        "Evidence image path is required.",
      ],

      trim: true,

      validate: [
        {
          validator(value) {
            return (
              typeof value === "string" &&
              /^\/uploads\/risks\/(before|after)\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(
                value
              )
            );
          },

          message:
            "Evidence must be a JPG, JPEG, PNG or WEBP image inside the Risk uploads folder.",
        },

        {
          validator(value) {
            return (
              typeof value === "string" &&
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

    collection: "risk_evidences",
  }
);

/* =========================================================
   NORMALIZE DATA

   Mongoose 9 compatible:

   - no next parameter
   - no next() call
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
      this.riskRegisterId =
        this.riskRegisterId
          .trim()
          .toUpperCase();
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
          .replaceAll("\\", "/");

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
   BEFORE/AFTER FOLDER VALIDATION

   Before Evidence:
   /uploads/risks/before/

   After Evidence:
   /uploads/risks/after/

   Mongoose 9 compatible:

   - no next parameter
   - no next() call
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

    const requiredFolder =
      `/uploads/risks/${this.evidenceType}/`;

    if (
      !this.imagePath.startsWith(
        requiredFolder
      )
    ) {
      this.invalidate(
        "imagePath",
        `${this.evidenceType} Evidence image must be stored inside ${requiredFolder}`
      );
    }
  }
);

/* =========================================================
   PREVENT DUPLICATE IMAGE RECORD

   Same Risk mein same Before/After image path dobara save
   nahi ho sakega.
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
   RISK EVIDENCE FETCH INDEX
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
   PROJECT EVIDENCE FETCH INDEX
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
   ========================================================= */

evidenceSchema.set("toJSON", {
  transform(
    _document,
    returnedObject
  ) {
    delete returnedObject.__v;

    return returnedObject;
  },
});

/* =========================================================
   MODEL EXPORT
   ========================================================= */

const Evidence =
  mongoose.models.RiskEvidence ||
  mongoose.model(
    "RiskEvidence",
    evidenceSchema
  );

export default Evidence;