import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   RISK SCHEMA

   Locked business fields:

   projectId
   projectCode
   serialNo
   riskRegisterId
   description
   status

   Before/After Evidence separate Evidence model mein hogi.
   ========================================================= */

const riskSchema = new Schema(
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

       Selected Project se automatically fetch hoga.
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
       SERIAL NUMBER
       ===================================================== */

    serialNo: {
      type: String,

      required: [
        true,
        "Serial number is required.",
      ],

      trim: true,

      minlength: [
        1,
        "Serial number is required.",
      ],

      maxlength: [
        50,
        "Serial number cannot exceed 50 characters.",
      ],
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
       DESCRIPTION
       ===================================================== */

    description: {
      type: String,

      required: [
        true,
        "Risk description is required.",
      ],

      trim: true,

      minlength: [
        3,
        "Risk description must contain at least 3 characters.",
      ],

      maxlength: [
        3000,
        "Risk description cannot exceed 3000 characters.",
      ],
    },

    /* =====================================================
       STATUS

       Supported values:

       in_progress
       complete
       ===================================================== */

    status: {
      type: String,

      required: [
        true,
        "Risk status is required.",
      ],

      enum: {
        values: [
          "in_progress",
          "complete",
        ],

        message:
          "Status must be in_progress or complete.",
      },

      default: "in_progress",

      index: true,
    },
  },
  {
    timestamps: true,

    versionKey: false,

    strict: true,
  }
);

/* =========================================================
   UNIQUE PROJECT SERIAL NUMBER

   Same Project ke andar duplicate serialNo allowed nahi.
   ========================================================= */

riskSchema.index(
  {
    projectId: 1,
    serialNo: 1,
  },
  {
    unique: true,

    name:
      "unique_project_serial_number",
  }
);

/* =========================================================
   UNIQUE PROJECT RISK REGISTER ID

   Same Project ke andar duplicate Risk Register ID
   allowed nahi.
   ========================================================= */

riskSchema.index(
  {
    projectId: 1,
    riskRegisterId: 1,
  },
  {
    unique: true,

    name:
      "unique_project_risk_register_id",
  }
);

/* =========================================================
   LIST AND FILTER INDEX
   ========================================================= */

riskSchema.index(
  {
    projectId: 1,
    status: 1,
    createdAt: -1,
  },
  {
    name:
      "project_risk_status_index",
  }
);

/* =========================================================
   SEARCH INDEX
   ========================================================= */

riskSchema.index(
  {
    serialNo: "text",
    riskRegisterId: "text",
    description: "text",
    projectCode: "text",
  },
  {
    name:
      "risk_register_search_index",
  }
);

/* =========================================================
   NORMALIZE VALUES BEFORE VALIDATION

   Mongoose 9 compatible:

   - no next parameter
   - no next() call
   - synchronous normalization
   ========================================================= */

riskSchema.pre(
  "validate",
  function normalizeRiskValues() {
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
      typeof this.serialNo ===
      "string"
    ) {
      this.serialNo =
        this.serialNo.trim();
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
  }
);

/* =========================================================
   UPDATE VALIDATION

   Mongoose 9 compatible:

   - no next parameter
   - no next() call
   ========================================================= */

riskSchema.pre(
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
   JSON RESPONSE
   ========================================================= */

riskSchema.set("toJSON", {
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

const Risk =
  mongoose.models.Risk ||
  mongoose.model(
    "Risk",
    riskSchema
  );

export default Risk;