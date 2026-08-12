import mongoose from "mongoose";

import ActionPlan from "../../models/action_plans/actionPlan.model.js";
import Project from "../../models/project/project.model.js";
import Task from "../../models/task_register/task.model.js";

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  statusCode,
  message
) => {
  const error =
    new Error(
      message
    );

  error.statusCode =
    statusCode;

  error.status =
    statusCode;

  return error;
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const normalizeText = (
  value
) => {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
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

const getUserId = (
  user
) => {
  return (
    user?._id ||
    user?.id ||
    null
  );
};

const getProjectCode = (
  project
) => {
  return (
    normalizeText(
      project?.projectCode
    ) ||
    normalizeText(
      project?.referenceNo
    ) ||
    normalizeText(
      project?.projectReferenceNo
    ) ||
    normalizeText(
      project?.code
    )
  ).toUpperCase();
};

/* =========================================================
   PROJECT + TASK RELATIONSHIP
   ========================================================= */

const getProjectAndTask = async (
  projectId,
  taskId
) => {
  const normalizedProjectId =
    validateMongoId(
      projectId,
      "Project ID"
    );

  const normalizedTaskId =
    validateMongoId(
      taskId,
      "Task ID"
    );

  const [
    project,
    task,
  ] =
    await Promise.all([
      Project.findById(
        normalizedProjectId
      ).lean(),

      Task.findById(
        normalizedTaskId
      ).lean(),
    ]);

  if (!project) {
    throw createServiceError(
      404,
      "Project not found."
    );
  }

  if (!task) {
    throw createServiceError(
      404,
      "Task not found."
    );
  }

  if (
    String(
      task.projectId
    ) !==
    String(
      project._id
    )
  ) {
    throw createServiceError(
      400,
      "Selected Task does not belong to the selected Project."
    );
  }

  const projectCode =
    getProjectCode(
      project
    );

  if (!projectCode) {
    throw createServiceError(
      400,
      "Project Reference Number is missing."
    );
  }

  return {
    project,
    task,
    projectCode,
  };
};

/* =========================================================
   RESPONSE NORMALIZER
   ========================================================= */

const normalizeActionPlanResponse = (
  actionPlan
) => {
  if (!actionPlan) {
    return null;
  }

  const record =
    typeof actionPlan.toObject ===
      "function"
      ? actionPlan.toObject()
      : actionPlan;

  return {
    ...record,

    projectId:
      record.projectId?._id ||
      record.projectId,

    taskId:
      record.taskId?._id ||
      record.taskId,
  };
};

/* =========================================================
   CREATE ACTION PLAN
   ========================================================= */

export const createActionPlanService =
  async (
    payload,
    user
  ) => {
    const {
      project,
      task,
      projectCode,
    } =
      await getProjectAndTask(
        payload.projectId,
        payload.taskId
      );

    const userId =
      getUserId(
        user
      );

    const actionPlan =
      await ActionPlan.create({
        projectId:
          project._id,

        projectCode,

        taskId:
          task._id,

        taskSerialNo:
          task.serialNo ||
          undefined,

        title:
          payload.title,

        description:
          payload.description ||
          "",

        priority:
          payload.priority ||
          "medium",

        status:
          payload.status ||
          "pending",

        targetDate:
          payload.targetDate ||
          null,

        createdBy:
          userId,

        updatedBy:
          userId,
      });

    return {
      actionPlan:
        normalizeActionPlanResponse(
          actionPlan
        ),
    };
  };

/* =========================================================
   GET ACTION PLAN BY ID
   ========================================================= */

export const getActionPlanByIdService =
  async (
    actionPlanId
  ) => {
    const normalizedActionPlanId =
      validateMongoId(
        actionPlanId,
        "Action Plan ID"
      );

    const actionPlan =
      await ActionPlan.findById(
        normalizedActionPlanId
      )
        .populate({
          path:
            "projectId",

          select:
            "title projectName projectCode referenceNo projectReferenceNo status",
        })
        .populate({
          path:
            "taskId",

          select:
            "serialNo description status projectId",
        })
        .populate({
          path:
            "createdBy",

          select:
            "name fullName email",
        })
        .populate({
          path:
            "updatedBy",

          select:
            "name fullName email",
        });

    if (!actionPlan) {
      throw createServiceError(
        404,
        "Action Plan not found."
      );
    }

    return {
      actionPlan:
        actionPlan.toObject(),
    };
  };

/* =========================================================
   BUILD LIST QUERY
   ========================================================= */

const buildActionPlanQuery = (
  filters = {}
) => {
  const query = {};

  if (filters.projectId) {
    query.projectId =
      new mongoose.Types.ObjectId(
        filters.projectId
      );
  }

  if (filters.taskId) {
    query.taskId =
      new mongoose.Types.ObjectId(
        filters.taskId
      );
  }

  if (filters.status) {
    query.status =
      filters.status;
  }

  if (filters.priority) {
    query.priority =
      filters.priority;
  }

  if (filters.search) {
    query.$or = [
      {
        title: {
          $regex:
            filters.search,

          $options:
            "i",
        },
      },

      {
        description: {
          $regex:
            filters.search,

          $options:
            "i",
        },
      },

      {
        projectCode: {
          $regex:
            filters.search,

          $options:
            "i",
        },
      },
    ];
  }

  return query;
};

/* =========================================================
   GET ACTION PLANS
   ========================================================= */

export const getActionPlansService =
  async (
    filters = {}
  ) => {
    const page =
      Number(
        filters.page ||
        1
      );

    const limit =
      Number(
        filters.limit ||
        20
      );

    const skip =
      (page - 1) *
      limit;

    const sortBy =
      filters.sortBy ||
      "createdAt";

    const sortOrder =
      filters.sortOrder ===
      "asc"
        ? 1
        : -1;

    const query =
      buildActionPlanQuery(
        filters
      );

    const [
      actionPlans,
      total,
    ] =
      await Promise.all([
        ActionPlan.find(
          query
        )
          .populate({
            path:
              "projectId",

            select:
              "title projectName projectCode referenceNo projectReferenceNo status",
          })
          .populate({
            path:
              "taskId",

            select:
              "serialNo description status projectId",
          })
          .populate({
            path:
              "createdBy",

            select:
              "name fullName email",
          })
          .sort({
            [sortBy]:
              sortOrder,
          })
          .skip(
            skip
          )
          .limit(
            limit
          )
          .lean(),

        ActionPlan.countDocuments(
          query
        ),
      ]);

    const totalPages =
      Math.max(
        Math.ceil(
          total /
          limit
        ),
        1
      );

    return {
      actionPlans,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page <
          totalPages,

        hasPreviousPage:
          page >
          1,
      },
    };
  };

/* =========================================================
   GET PROJECT ACTION PLANS
   ========================================================= */

export const getProjectActionPlansService =
  async (
    projectId,
    filters = {}
  ) => {
    const normalizedProjectId =
      validateMongoId(
        projectId,
        "Project ID"
      );

    return getActionPlansService({
      ...filters,
      projectId:
        normalizedProjectId,
    });
  };

/* =========================================================
   GET TASK ACTION PLANS
   ========================================================= */

export const getTaskActionPlansService =
  async (
    taskId,
    filters = {}
  ) => {
    const normalizedTaskId =
      validateMongoId(
        taskId,
        "Task ID"
      );

    return getActionPlansService({
      ...filters,
      taskId:
        normalizedTaskId,
    });
  };

/* =========================================================
   UPDATE ACTION PLAN DETAILS
   ========================================================= */

export const updateActionPlanService =
  async (
    actionPlanId,
    payload,
    user
  ) => {
    const normalizedActionPlanId =
      validateMongoId(
        actionPlanId,
        "Action Plan ID"
      );

    const actionPlan =
      await ActionPlan.findById(
        normalizedActionPlanId
      );

    if (!actionPlan) {
      throw createServiceError(
        404,
        "Action Plan not found."
      );
    }

    const editableFields = [
      "title",
      "description",
      "priority",
      "targetDate",
    ];

    editableFields.forEach(
      (field) => {
        if (
          Object.prototype
            .hasOwnProperty.call(
              payload,
              field
            )
        ) {
          actionPlan[field] =
            payload[field];
        }
      }
    );

    actionPlan.updatedBy =
      getUserId(
        user
      );

    await actionPlan.save();

    return {
      actionPlan:
        normalizeActionPlanResponse(
          actionPlan
        ),
    };
  };

/* =========================================================
   UPDATE STATUS

   IMPORTANT:
   Action Plan status does not automatically change Task status.
   ========================================================= */

export const updateActionPlanStatusService =
  async (
    actionPlanId,
    status,
    user
  ) => {
    const normalizedActionPlanId =
      validateMongoId(
        actionPlanId,
        "Action Plan ID"
      );

    const actionPlan =
      await ActionPlan.findById(
        normalizedActionPlanId
      );

    if (!actionPlan) {
      throw createServiceError(
        404,
        "Action Plan not found."
      );
    }

    actionPlan.status =
      status;

    actionPlan.updatedBy =
      getUserId(
        user
      );

    /*
      The model save hook manages completedAt.
    */

    await actionPlan.save();

    return {
      actionPlan:
        normalizeActionPlanResponse(
          actionPlan
        ),
    };
  };

/* =========================================================
   DELETE ACTION PLAN
   ========================================================= */

export const deleteActionPlanService =
  async (
    actionPlanId
  ) => {
    const normalizedActionPlanId =
      validateMongoId(
        actionPlanId,
        "Action Plan ID"
      );

    const actionPlan =
      await ActionPlan.findById(
        normalizedActionPlanId
      );

    if (!actionPlan) {
      throw createServiceError(
        404,
        "Action Plan not found."
      );
    }

    const deletedActionPlan =
      actionPlan.toObject();

    await actionPlan.deleteOne();

    return {
      actionPlan:
        deletedActionPlan,
    };
  };

/* =========================================================
   DASHBOARD SUMMARY
   ========================================================= */

export const getActionPlanSummaryService =
  async (
    projectId
  ) => {
    const query = {};

    if (projectId) {
      const normalizedProjectId =
        validateMongoId(
          projectId,
          "Project ID"
        );

      query.projectId =
        new mongoose.Types.ObjectId(
          normalizedProjectId
        );
    }

    const [
      total,
      pending,
      inProgress,
      complete,
      onHold,
      critical,
      overdue,
    ] =
      await Promise.all([
        ActionPlan.countDocuments(
          query
        ),

        ActionPlan.countDocuments({
          ...query,
          status:
            "pending",
        }),

        ActionPlan.countDocuments({
          ...query,
          status:
            "in_progress",
        }),

        ActionPlan.countDocuments({
          ...query,
          status:
            "complete",
        }),

        ActionPlan.countDocuments({
          ...query,
          status:
            "on_hold",
        }),

        ActionPlan.countDocuments({
          ...query,
          priority:
            "critical",
        }),

        ActionPlan.countDocuments({
          ...query,

          status: {
            $ne:
              "complete",
          },

          targetDate: {
            $ne:
              null,

            $lt:
              new Date(),
          },
        }),
      ]);

    const completionPercentage =
      total > 0
        ? Math.round(
            (
              complete /
              total
            ) *
            100
          )
        : 0;

    return {
      total,
      pending,
      inProgress,
      complete,
      onHold,
      critical,
      overdue,
      completionPercentage,
    };
  };
