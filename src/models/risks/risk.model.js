import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   RISK SERIAL COUNTER

   Har project ka independent serial sequence maintain karta hai.

   Example:

   Project A → 1, 2, 3
   Project B → 1, 2, 3
   ========================================================= */

const riskSerialCounterSchema =
  new Schema(
    {
      projectId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Project",

        required: true,

        unique: true,

        index: true,
      },

      sequence: {
        type: Number,

        required: true,

        default: 0,

        min: 0,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      strict: true,
    }
  );

const RiskSerialCounter =
  mongoose.models
    .RiskSerialCounter ||
  mongoose.model(
    "RiskSerialCounter",
    riskSerialCounterSchema
  );

/* =========================================================
   RESERVE SERIAL NUMBER RANGE

   Single Risk:

   reserveRiskSerialRange(projectId, 1)

   Bulk Import:

   reserveRiskSerialRange(projectId, 200)

   Atomic operation hai, is liye concurrent requests duplicate
   serial number generate nahi karengi.

   Failed save/import ki surat mein sequence mein gap aa sakta hai.
   ========================================================= */

export const reserveRiskSerialRange =
  async (
    projectId,
    count = 1
  ) => {
    if (
      !mongoose.isValidObjectId(
        projectId
      )
    ) {
      throw new Error(
        "A valid Project ID is required for serial number allocation."
      );
    }

    const normalizedCount =
      Number.parseInt(
        String(count),
        10
      );

    if (
      !Number.isInteger(
        normalizedCount
      ) ||
      normalizedCount < 1
    ) {
      throw new Error(
        "Serial number allocation count must be a positive integer."
      );
    }

    const counter =
      await RiskSerialCounter
        .findOneAndUpdate(
          {
            projectId,
          },
          {
            $inc: {
              sequence:
                normalizedCount,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert:
              true,
          }
        )
        .lean();

    const endSerial =
      counter.sequence;

    const startSerial =
      endSerial -
      normalizedCount +
      1;

    return {
      startSerial,
      endSerial,
      count:
        normalizedCount,
    };
  };

/* =========================================================
   RISK SCHEMA

   Locked business fields:

   projectId
   projectCode
   serialNo
   riskRegisterId
   description
   status

   Before/After Evidence separate Evidence model mein rahegi.
   ========================================================= */

const riskSchema =
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

         Database compatibility ke liye field ka naam
         projectCode rahega.

         UI mein label:
         Project Reference Number
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
         SERIAL NUMBER

         - Number type
         - Project-wise automatic
         - User input nahi karega
         - Create ke baad immutable
         ===================================================== */

      serialNo: {
        type: Number,

        required: [
          true,
          "Serial number is required.",
        ],

        min: [
          1,
          "Serial number must be at least 1.",
        ],

        immutable: true,

        index: true,
      },

      /* =====================================================
         RISK REGISTER ID

         Optional field.

         Iski frontend/API availability Project setting se
         control hogi:

         settings.riskRegisterIdEnabled
         ===================================================== */

      riskRegisterId: {
        type: String,

        required: false,

        default: undefined,

        trim: true,
        uppercase: true,

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

        default:
          "in_progress",

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
   UNIQUE OPTIONAL RISK REGISTER ID

   Same project ke andar duplicate non-empty ID allowed nahi.

   Blank/missing Risk Register IDs multiple records mein
   allowed hain.
   ========================================================= */

riskSchema.index(
  {
    projectId: 1,
    riskRegisterId: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      riskRegisterId: {
        $type: "string",
      },
    },

    name:
      "unique_project_risk_register_id",
  }
);

/* =========================================================
   PROJECT LIST AND STATUS FILTER INDEX
   ========================================================= */

riskSchema.index(
  {
    projectId: 1,
    status: 1,
    serialNo: 1,
  },
  {
    name:
      "project_risk_status_serial_index",
  }
);

/* =========================================================
   PROJECT CREATION DATE INDEX
   ========================================================= */

riskSchema.index(
  {
    projectId: 1,
    createdAt: -1,
  },
  {
    name:
      "project_risk_created_index",
  }
);

/* =========================================================
   TEXT SEARCH INDEX

   serialNo Number hai, is liye text index mein include nahi.

   Numeric serial search service mein exact number query se hogi.
   ========================================================= */

riskSchema.index(
  {
    riskRegisterId:
      "text",

    description:
      "text",

    projectCode:
      "text",
  },
  {
    name:
      "risk_register_search_index",

    weights: {
      riskRegisterId: 10,
      projectCode: 5,
      description: 1,
    },
  }
);

/* =========================================================
   NORMALIZE AND GENERATE VALUES BEFORE VALIDATION

   Mongoose 9 compatible async middleware.
   ========================================================= */

riskSchema.pre(
  "validate",
  async function prepareRiskValues() {
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
      const normalizedRiskRegisterId =
        this.riskRegisterId
          .trim()
          .toUpperCase();

      this.riskRegisterId =
        normalizedRiskRegisterId ||
        undefined;
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

    /*
      Existing Risk update par serial dobara generate nahi hoga.

      New Risk aur missing serialNo par project-wise next
      number reserve hoga.
    */

    if (
      this.isNew &&
      (
        this.serialNo ===
          undefined ||
        this.serialNo ===
          null
      )
    ) {
      if (!this.projectId) {
        return;
      }

      const serialRange =
        await reserveRiskSerialRange(
          this.projectId,
          1
        );

      this.serialNo =
        serialRange.startSerial;
    }
  }
);

/* =========================================================
   UPDATE VALIDATION
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
   QUERY UPDATE NORMALIZATION
   ========================================================= */

riskSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ],
  function normalizeRiskUpdate() {
    const update =
      this.getUpdate();

    if (!update) {
      return;
    }

    const directUpdate =
      update.$set ||
      update;

    if (
      typeof directUpdate
        .riskRegisterId ===
      "string"
    ) {
      const normalizedRiskRegisterId =
        directUpdate.riskRegisterId
          .trim()
          .toUpperCase();

      if (
        normalizedRiskRegisterId
      ) {
        directUpdate.riskRegisterId =
          normalizedRiskRegisterId;
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

    if (
      typeof directUpdate
        .description ===
      "string"
    ) {
      directUpdate.description =
        directUpdate.description.trim();
    }

    if (
      typeof directUpdate.status ===
      "string"
    ) {
      directUpdate.status =
        directUpdate.status
          .trim()
          .toLowerCase();
    }

    this.setUpdate(update);
  }
);

/* =========================================================
   JSON RESPONSE
   ========================================================= */

riskSchema.set(
  "toJSON",
  {
    transform(
      _document,
      returnedObject
    ) {
      delete returnedObject.__v;

      return returnedObject;
    },
  }
);

/* =========================================================
   MODEL EXPORT
   ========================================================= */

const Risk =
  mongoose.models.Risk ||
  mongoose.model(
    "Risk",
    riskSchema
  );

export {
  RiskSerialCounter,
};

export default Risk;