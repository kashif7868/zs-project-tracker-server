import mongoose from "mongoose";

import {
  ACTION_PLAN_PRIORITIES,
  ACTION_PLAN_STATUSES,
} from "../../models/action_plans/actionPlan.model.js";

/* =========================================================
   RESPONSE HELPER
   ========================================================= */

const sendValidationError = (
  res,
  message,
  errors = []
) => {
  return res
    .status(400)
    .json({
      success: false,
      message,
      errors,
    });
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const normalizeText = (
  value
) =>
  typeof value === "string"
    ? value.trim()
    : "";

const isValidObjectId = (
  value
) =>
  typeof value === "string" &&
  mongoose.isValidObjectId(
    value.trim()
  );

/* =========================================================
   ACTION PLAN ID PARAM
   ========================================================= */

export const validateActionPlanIdParam = (
  req,
  res,
  next
) => {
  const actionPlanId =
    normalizeText(
      req.params.actionPlanId
    );

  if (
    !isValidObjectId(
      actionPlanId
    )
  ) {
    return sendValidationError(
      res,
      "Action Plan ID is invalid.",
      [
        {
          field: "actionPlanId",
          message:
            "A valid MongoDB Action Plan ID is required.",
        },
      ]
    );
  }

  req.params.actionPlanId =
    actionPlanId;

  return next();
};

/* =========================================================
   PROJECT ID PARAM
   ========================================================= */

export const validateProjectIdParam = (
  req,
  res,
  next
) => {
  const projectId =
    normalizeText(
      req.params.projectId
    );

  if (
    !isValidObjectId(
      projectId
    )
  ) {
    return sendValidationError(
      res,
      "Project ID is invalid.",
      [
        {
          field: "projectId",
          message:
            "A valid MongoDB Project ID is required.",
        },
      ]
    );
  }

  req.params.projectId =
    projectId;

  return next();
};

/* =========================================================
   TASK ID PARAM
   ========================================================= */

export const validateTaskIdParam = (
  req,
  res,
  next
) => {
  const taskId =
    normalizeText(
      req.params.taskId
    );

  if (
    !isValidObjectId(
      taskId
    )
  ) {
    return sendValidationError(
      res,
      "Task ID is invalid.",
      [
        {
          field: "taskId",
          message:
            "A valid MongoDB Task ID is required.",
        },
      ]
    );
  }

  req.params.taskId =
    taskId;

  return next();
};

/* =========================================================
   CREATE ACTION PLAN
   ========================================================= */

export const validateCreateActionPlan = (
  req,
  res,
  next
) => {
  const body =
    req.body &&
    typeof req.body === "object"
      ? req.body
      : {};

  const errors = [];

  const projectId =
    normalizeText(
      body.projectId
    );

  const taskId =
    normalizeText(
      body.taskId
    );

  const title =
    normalizeText(
      body.title
    );

  const description =
    normalizeText(
      body.description
    );

  const priority =
    normalizeText(
      body.priority ||
      "medium"
    ).toLowerCase();

  const status =
    normalizeText(
      body.status ||
      "pending"
    ).toLowerCase();

  if (
    !isValidObjectId(
      projectId
    )
  ) {
    errors.push({
      field: "projectId",
      message:
        "A valid Project ID is required.",
    });
  }

  if (
    !isValidObjectId(
      taskId
    )
  ) {
    errors.push({
      field: "taskId",
      message:
        "A valid Task ID is required.",
    });
  }

  if (
    title.length < 3 ||
    title.length > 250
  ) {
    errors.push({
      field: "title",
      message:
        "Action Plan title must contain between 3 and 250 characters.",
    });
  }

  if (
    description.length > 5000
  ) {
    errors.push({
      field: "description",
      message:
        "Action Plan description cannot exceed 5000 characters.",
    });
  }

  if (
    !ACTION_PLAN_PRIORITIES.includes(
      priority
    )
  ) {
    errors.push({
      field: "priority",
      message:
        "Priority must be low, medium, high or critical.",
    });
  }

  if (
    !ACTION_PLAN_STATUSES.includes(
      status
    )
  ) {
    errors.push({
      field: "status",
      message:
        "Status must be pending, in_progress, complete or on_hold.",
    });
  }

  let targetDate = null;

  if (
    body.targetDate !== undefined &&
    body.targetDate !== null &&
    normalizeText(
      String(
        body.targetDate
      )
    )
  ) {
    const parsedDate =
      new Date(
        body.targetDate
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      errors.push({
        field: "targetDate",
        message:
          "Target Date is invalid.",
      });
    } else {
      targetDate =
        parsedDate;
    }
  }

  if (errors.length) {
    return sendValidationError(
      res,
      "Action Plan validation failed.",
      errors
    );
  }

  req.body = {
    projectId,
    taskId,
    title,
    description,
    priority,
    status,
    targetDate,
  };

  return next();
};

/* =========================================================
   UPDATE ACTION PLAN
   ========================================================= */

export const validateUpdateActionPlan = (
  req,
  res,
  next
) => {
  const body =
    req.body &&
    typeof req.body === "object"
      ? req.body
      : {};

  const errors = [];

  const allowedFields =
    new Set([
      "title",
      "description",
      "priority",
      "targetDate",
    ]);

  const normalizedBody = {};

  Object.keys(
    body
  ).forEach(
    (field) => {
      if (
        !allowedFields.has(
          field
        )
      ) {
        errors.push({
          field,
          message:
            `${field} cannot be updated from this endpoint.`,
        });
      }
    }
  );

  if (
    Object.prototype
      .hasOwnProperty.call(
        body,
        "title"
      )
  ) {
    const title =
      normalizeText(
        body.title
      );

    if (
      title.length < 3 ||
      title.length > 250
    ) {
      errors.push({
        field: "title",
        message:
          "Action Plan title must contain between 3 and 250 characters.",
      });
    } else {
      normalizedBody.title =
        title;
    }
  }

  if (
    Object.prototype
      .hasOwnProperty.call(
        body,
        "description"
      )
  ) {
    const description =
      normalizeText(
        body.description
      );

    if (
      description.length > 5000
    ) {
      errors.push({
        field: "description",
        message:
          "Action Plan description cannot exceed 5000 characters.",
      });
    } else {
      normalizedBody.description =
        description;
    }
  }

  if (
    Object.prototype
      .hasOwnProperty.call(
        body,
        "priority"
      )
  ) {
    const priority =
      normalizeText(
        body.priority
      ).toLowerCase();

    if (
      !ACTION_PLAN_PRIORITIES.includes(
        priority
      )
    ) {
      errors.push({
        field: "priority",
        message:
          "Priority must be low, medium, high or critical.",
      });
    } else {
      normalizedBody.priority =
        priority;
    }
  }

  if (
    Object.prototype
      .hasOwnProperty.call(
        body,
        "targetDate"
      )
  ) {
    if (
      body.targetDate === null ||
      normalizeText(
        String(
          body.targetDate
        )
      ) === ""
    ) {
      normalizedBody.targetDate =
        null;
    } else {
      const parsedDate =
        new Date(
          body.targetDate
        );

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        errors.push({
          field: "targetDate",
          message:
            "Target Date is invalid.",
        });
      } else {
        normalizedBody.targetDate =
          parsedDate;
      }
    }
  }

  if (errors.length) {
    return sendValidationError(
      res,
      "Action Plan update validation failed.",
      errors
    );
  }

  if (
    Object.keys(
      normalizedBody
    ).length === 0
  ) {
    return sendValidationError(
      res,
      "At least one editable Action Plan field is required."
    );
  }

  req.body =
    normalizedBody;

  return next();
};

/* =========================================================
   STATUS ACTION VALIDATION
   ========================================================= */

export const validateActionPlanStatus = (
  req,
  res,
  next
) => {
  const status =
    normalizeText(
      req.body?.status
    ).toLowerCase();

  if (
    !ACTION_PLAN_STATUSES.includes(
      status
    )
  ) {
    return sendValidationError(
      res,
      "Action Plan status is invalid.",
      [
        {
          field: "status",
          message:
            "Status must be pending, in_progress, complete or on_hold.",
        },
      ]
    );
  }

  req.body = {
    status,
  };

  return next();
};

/* =========================================================
   LIST QUERY VALIDATION

   Express 5 note:
   req.query is getter-only. Do NOT assign req.query.

   Normalized query is stored in:
   req.validatedQuery
   ========================================================= */

export const validateActionPlanListQuery = (
  req,
  res,
  next
) => {
  const query =
    req.query ?? {};

  const errors = [];
  const normalizedQuery = {};

  const projectId =
    normalizeText(
      query.projectId
    );

  const taskId =
    normalizeText(
      query.taskId
    );

  const status =
    normalizeText(
      query.status
    ).toLowerCase();

  const priority =
    normalizeText(
      query.priority
    ).toLowerCase();

  const search =
    normalizeText(
      query.search
    );

  if (projectId) {
    if (
      !isValidObjectId(
        projectId
      )
    ) {
      errors.push({
        field: "projectId",
        message:
          "Project ID is invalid.",
      });
    } else {
      normalizedQuery.projectId =
        projectId;
    }
  }

  if (taskId) {
    if (
      !isValidObjectId(
        taskId
      )
    ) {
      errors.push({
        field: "taskId",
        message:
          "Task ID is invalid.",
      });
    } else {
      normalizedQuery.taskId =
        taskId;
    }
  }

  if (status) {
    if (
      !ACTION_PLAN_STATUSES.includes(
        status
      )
    ) {
      errors.push({
        field: "status",
        message:
          "Status is invalid.",
      });
    } else {
      normalizedQuery.status =
        status;
    }
  }

  if (priority) {
    if (
      !ACTION_PLAN_PRIORITIES.includes(
        priority
      )
    ) {
      errors.push({
        field: "priority",
        message:
          "Priority is invalid.",
      });
    } else {
      normalizedQuery.priority =
        priority;
    }
  }

  if (search) {
    normalizedQuery.search =
      search;
  }

  const page =
    Number(
      query.page ||
      1
    );

  const limit =
    Number(
      query.limit ||
      20
    );

  if (
    !Number.isInteger(
      page
    ) ||
    page < 1
  ) {
    errors.push({
      field: "page",
      message:
        "Page must be a positive integer.",
    });
  } else {
    normalizedQuery.page =
      page;
  }

  if (
    !Number.isInteger(
      limit
    ) ||
    limit < 1 ||
    limit > 100
  ) {
    errors.push({
      field: "limit",
      message:
        "Limit must be between 1 and 100.",
    });
  } else {
    normalizedQuery.limit =
      limit;
  }

  const allowedSortFields =
    new Set([
      "createdAt",
      "updatedAt",
      "targetDate",
      "priority",
      "status",
      "title",
    ]);

  const sortBy =
    normalizeText(
      query.sortBy ||
      "createdAt"
    );

  const sortOrder =
    normalizeText(
      query.sortOrder ||
      "desc"
    ).toLowerCase();

  if (
    !allowedSortFields.has(
      sortBy
    )
  ) {
    errors.push({
      field: "sortBy",
      message:
        "Sort field is invalid.",
    });
  } else {
    normalizedQuery.sortBy =
      sortBy;
  }

  if (
    sortOrder !== "asc" &&
    sortOrder !== "desc"
  ) {
    errors.push({
      field: "sortOrder",
      message:
        "Sort order must be asc or desc.",
    });
  } else {
    normalizedQuery.sortOrder =
      sortOrder;
  }

  if (errors.length) {
    return sendValidationError(
      res,
      "Action Plan query validation failed.",
      errors
    );
  }

  req.validatedQuery =
    normalizedQuery;

  return next();
};
