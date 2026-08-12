import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   TASK SERIAL COUNTER

   Har project ka independent stored serial sequence maintain
   karta hai.

   IMPORTANT:
   MongoDB compatibility ke liye existing counter collection
   "riskserialcounters" preserve ki gayi hai.

   Example:

   Project A -> 1, 2, 3
   Project B -> 1, 2, 3
   ========================================================= */

const taskSerialCounterSchema =
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

      collection:
        "riskserialcounters",
    }
  );

const TaskSerialCounter =
  mongoose.models
    .TaskSerialCounter ||
  mongoose.model(
    "TaskSerialCounter",
    taskSerialCounterSchema,
    "riskserialcounters"
  );

/* =========================================================
   RESERVE TASK SERIAL NUMBER RANGE

   Single Task:

   reserveTaskSerialRange(projectId, 1)

   Bulk Import:

   reserveTaskSerialRange(projectId, 200)

   Atomic operation hai.

   NOTE:
   Stored serialNo permanent/internal identity hai.
   Client/dashboard list ka visible Sr. No. service/UI current
   list position se continuous 1,2,3... calculate karega.
   ========================================================= */

export const reserveTaskSerialRange =
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
        "A valid Project ID is required for task serial number allocation."
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
        "Task serial number allocation count must be a positive integer."
      );
    }

    const counter =
      await TaskSerialCounter
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
   TASK SCHEMA

   Current project workflow intentionally simple hai:

   projectId
   projectCode
   serialNo
   taskRegisterId
   description
   status: in_progress | complete
   completedAt
   createdAt
   updatedAt

   Before/After Evidence separate Evidence model mein rahegi.

   IMPORTANT DATABASE COMPATIBILITY:

   1. Application model ka naam ab "Task" hai.
   2. Existing MongoDB collection "risks" preserve hai.
   3. Existing DB field "riskRegisterId" preserve hai.
      Application code task.taskRegisterId use kar sakta hai
      through Mongoose alias.
   ========================================================= */

const taskSchema =
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

         Database compatibility ke liye projectCode preserve.
         UI label:
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
         STORED SERIAL NUMBER

         Backend internal/permanent serial identity.

         Visible Task Register Sr. No. is NOT required to use
         this value after deletions. Service/UI will expose a
         separate continuous displaySrNo.
         ===================================================== */

      serialNo: {
        type: Number,

        required: [
          true,
          "Task serial number is required.",
        ],

        min: [
          1,
          "Task serial number must be at least 1.",
        ],

        immutable: true,

        index: true,
      },

      /* =====================================================
         TASK REGISTER ID

         Canonical application property:
         taskRegisterId

         Existing MongoDB field:
         riskRegisterId

         Mongoose alias lets new code use:
         task.taskRegisterId

         without rewriting existing DB records immediately.

         Project setting controls availability.
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
         DESCRIPTION

         Current Task Register ka main business field.
         ===================================================== */

      description: {
        type: String,

        required: [
          true,
          "Task description is required.",
        ],

        trim: true,

        minlength: [
          3,
          "Task description must contain at least 3 characters.",
        ],

        maxlength: [
          3000,
          "Task description cannot exceed 3000 characters.",
        ],
      },

      /* =====================================================
         STATUS

         Simple workflow:

         in_progress
         complete
         ===================================================== */

      status: {
        type: String,

        required: [
          true,
          "Task status is required.",
        ],

        enum: {
          values: [
            "in_progress",
            "complete",
          ],

          message:
            "Task status must be in_progress or complete.",
        },

        default:
          "in_progress",

        index: true,
      },

      /* =====================================================
         COMPLETION TIMESTAMP

         Complete status par automatically set hoga.
         In Progress par clear ho jayega.
         ===================================================== */

      completedAt: {
        type: Date,

        required: false,

        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      strict: true,

      /*
        Existing records preserve karne ke liye current MongoDB
        collection intentionally "risks" hi rakhi gayi hai.
      */
      collection:
        "risks",

      /*
        Alias taskRegisterId ko JSON/object output mein include
        karne ke liye virtuals enable hain.
      */
      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================================================
   UNIQUE PROJECT STORED SERIAL NUMBER
   ========================================================= */

taskSchema.index(
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
   UNIQUE OPTIONAL TASK REGISTER ID

   Existing physical DB field riskRegisterId par index preserve
   kiya gaya hai.

   Same project ke andar duplicate non-empty Task Register ID
   allowed nahi.
   ========================================================= */

taskSchema.index(
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
   PROJECT TASK STATUS / SERIAL INDEX
   ========================================================= */

taskSchema.index(
  {
    projectId: 1,
    status: 1,
    serialNo: 1,
  },
  {
    name:
      "project_task_status_serial_index",
  }
);

/* =========================================================
   PROJECT CREATION DATE INDEX
   ========================================================= */

taskSchema.index(
  {
    projectId: 1,
    createdAt: -1,
  },
  {
    name:
      "project_task_created_index",
  }
);

/* =========================================================
   TEXT SEARCH INDEX

   Physical riskRegisterId field preserve hai.
   UI/application terminology Task Register ID hogi.
   ========================================================= */

taskSchema.index(
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
      "task_register_search_index",

    weights: {
      riskRegisterId: 10,
      projectCode: 5,
      description: 1,
    },
  }
);

/* =========================================================
   NORMALIZE AND GENERATE VALUES BEFORE VALIDATION
   ========================================================= */

taskSchema.pre(
  "validate",
  async function prepareTaskValues() {
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
      this.status ===
      "complete"
    ) {
      if (!this.completedAt) {
        this.completedAt =
          new Date();
      }
    } else {
      this.completedAt =
        null;
    }

    /*
      New Task par project-wise stored serial number reserve.
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
        await reserveTaskSerialRange(
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

taskSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ],
  function configureTaskUpdateValidation() {
    this.setOptions({
      runValidators: true,
      context: "query",
    });
  }
);

/* =========================================================
   QUERY UPDATE NORMALIZATION
   ========================================================= */

taskSchema.pre(
  [
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ],
  function normalizeTaskUpdate() {
    const update =
      this.getUpdate();

    if (!update) {
      return;
    }

    const directUpdate =
      update.$set ||
      update;

    /*
      New application code may send taskRegisterId.
      Convert it to the existing physical MongoDB field.
    */

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

      if (
        directUpdate.status ===
        "complete"
      ) {
        if (
          !directUpdate.completedAt
        ) {
          directUpdate.completedAt =
            new Date();
        }
      } else {
        directUpdate.completedAt =
          null;
      }
    }

    this.setUpdate(update);
  }
);

/* =========================================================
   JSON RESPONSE

   New response terminology:
   taskRegisterId

   Legacy riskRegisterId bhi temporary compatibility ke liye
   preserve hai. Service migration complete hone ke baad legacy
   key remove ki ja sakti hai.
   ========================================================= */

taskSchema.set(
  "toJSON",
  {
    virtuals: true,

    transform(
      _document,
      returnedObject
    ) {
      delete returnedObject.__v;

      /*
        Explicitly expose canonical Task Register field.
      */
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
   Task

   Physical MongoDB collection:
   risks

   Is approach se existing data safely preserve hota hai while
   codebase Task terminology par migrate hota hai.
   ========================================================= */

const Task =
  mongoose.models.Task ||
  mongoose.model(
    "Task",
    taskSchema,
    "risks"
  );

export {
  TaskSerialCounter,
};

/*
  TEMPORARY LEGACY ALIASES

  Agli files migrate karte waqt purane imports ko ekdam break
  hone se bachane ke liye aliases available hain.

  Final cleanup phase mein remove kar denge.
*/

export const Risk =
  Task;

export const RiskSerialCounter =
  TaskSerialCounter;

export const reserveRiskSerialRange =
  reserveTaskSerialRange;

export default Task;
