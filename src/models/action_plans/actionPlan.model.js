import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   ACTION PLAN CONSTANTS
   ========================================================= */

export const ACTION_PLAN_STATUSES = [
  "pending",
  "in_progress",
  "complete",
  "on_hold",
];

export const ACTION_PLAN_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
];

/* =========================================================
   ACTION PLAN SCHEMA
   ========================================================= */

const actionPlanSchema =
  new Schema(
    {
      /* =====================================================
         PROJECT
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

        index: true,
      },

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

        index: true,
      },

      /* =====================================================
         TASK
         ===================================================== */

      taskId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Task",

        required: [
          true,
          "Task ID is required.",
        ],

        index: true,
      },

      taskSerialNo: {
        type: Number,

        required: false,

        min: [
          1,
          "Task Serial Number must be greater than zero.",
        ],
      },

      /* =====================================================
         ACTION PLAN CONTENT
         ===================================================== */

      title: {
        type: String,

        required: [
          true,
          "Action Plan title is required.",
        ],

        trim: true,

        minlength: [
          3,
          "Action Plan title must contain at least 3 characters.",
        ],

        maxlength: [
          250,
          "Action Plan title cannot exceed 250 characters.",
        ],

        index: true,
      },

      description: {
        type: String,

        required: false,

        default: "",

        trim: true,

        maxlength: [
          5000,
          "Action Plan description cannot exceed 5000 characters.",
        ],
      },

      /* =====================================================
         PRIORITY
         ===================================================== */

      priority: {
        type: String,

        enum: {
          values:
            ACTION_PLAN_PRIORITIES,

          message:
            "Priority must be low, medium, high or critical.",
        },

        default:
          "medium",

        index: true,
      },

      /* =====================================================
         STATUS
         ===================================================== */

      status: {
        type: String,

        enum: {
          values:
            ACTION_PLAN_STATUSES,

          message:
            "Status must be pending, in_progress, complete or on_hold.",
        },

        default:
          "pending",

        index: true,
      },

      /* =====================================================
         TARGET / COMPLETION DATES
         ===================================================== */

      targetDate: {
        type: Date,

        required: false,

        default: null,

        index: true,
      },

      completedAt: {
        type: Date,

        required: false,

        default: null,

        index: true,
      },

      /* =====================================================
         AUDIT FIELDS
         ===================================================== */

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: false,

        default: null,

        index: true,
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: false,

        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      strict: true,

      collection:
        "action_plans",
    }
  );

/* =========================================================
   NORMALIZATION
   ========================================================= */

actionPlanSchema.pre(
  "validate",
  function normalizeActionPlan() {
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
      typeof this.priority ===
      "string"
    ) {
      this.priority =
        this.priority
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
  }
);

/* =========================================================
   STATUS / COMPLETION SYNC

   Action Plan completion does NOT automatically complete
   the linked Task.

   Task completion remains controlled by existing Evidence +
   manual Mark Complete workflow.
   ========================================================= */

actionPlanSchema.pre(
  "save",
  function syncCompletionDate() {
    if (
      this.status ===
      "complete"
    ) {
      if (!this.completedAt) {
        this.completedAt =
          new Date();
      }

      return;
    }

    this.completedAt =
      null;
  }
);

/* =========================================================
   UPDATE VALIDATION
   ========================================================= */

actionPlanSchema.pre(
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
   INDEXES
   ========================================================= */

actionPlanSchema.index(
  {
    projectId: 1,
    taskId: 1,
    createdAt: -1,
  },
  {
    name:
      "project_task_action_plan_index",
  }
);

actionPlanSchema.index(
  {
    projectId: 1,
    status: 1,
    priority: 1,
    targetDate: 1,
  },
  {
    name:
      "project_action_plan_status_index",
  }
);

actionPlanSchema.index(
  {
    taskId: 1,
    status: 1,
    createdAt: -1,
  },
  {
    name:
      "task_action_plan_status_index",
  }
);

/* =========================================================
   JSON RESPONSE
   ========================================================= */

actionPlanSchema.set(
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

const ActionPlan =
  mongoose.models
    .ActionPlan ||
  mongoose.model(
    "ActionPlan",
    actionPlanSchema,
    "action_plans"
  );

export default ActionPlan;
