import {
  createActionPlanService,
  deleteActionPlanService,
  getActionPlanByIdService,
  getActionPlansService,
  getActionPlanSummaryService,
  getProjectActionPlansService,
  getTaskActionPlansService,
  updateActionPlanService,
  updateActionPlanStatusService,
} from "./actionPlan.service.js";

/* =========================================================
   RESPONSE HELPER
   ========================================================= */

const sendSuccessResponse = (
  res,
  statusCode,
  message,
  data = {}
) => {
  return res
    .status(statusCode)
    .json({
      success: true,
      message,
      data,
    });
};

/* =========================================================
   CREATE ACTION PLAN
   ========================================================= */

export const createActionPlan =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await createActionPlanService(
          req.body,
          req.user
        );

      return sendSuccessResponse(
        res,
        201,
        "Action Plan created successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET ALL ACTION PLANS
   ========================================================= */

export const getActionPlans =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getActionPlansService(
          req.validatedQuery ??
          req.query ??
          {}
        );

      return sendSuccessResponse(
        res,
        200,
        "Action Plans retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET ACTION PLAN SUMMARY
   ========================================================= */

export const getActionPlanSummary =
  async (
    req,
    res,
    next
  ) => {
    try {
      const projectId =
        req.query?.projectId ||
        "";

      const result =
        await getActionPlanSummaryService(
          projectId
        );

      return sendSuccessResponse(
        res,
        200,
        "Action Plan summary retrieved successfully.",
        {
          summary:
            result,
        }
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET PROJECT ACTION PLANS
   ========================================================= */

export const getProjectActionPlans =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getProjectActionPlansService(
          req.params.projectId,
          req.validatedQuery ??
          req.query ??
          {}
        );

      return sendSuccessResponse(
        res,
        200,
        "Project Action Plans retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET TASK ACTION PLANS
   ========================================================= */

export const getTaskActionPlans =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getTaskActionPlansService(
          req.params.taskId,
          req.validatedQuery ??
          req.query ??
          {}
        );

      return sendSuccessResponse(
        res,
        200,
        "Task Action Plans retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET SINGLE ACTION PLAN
   ========================================================= */

export const getActionPlanById =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getActionPlanByIdService(
          req.params.actionPlanId
        );

      return sendSuccessResponse(
        res,
        200,
        "Action Plan retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE ACTION PLAN DETAILS
   ========================================================= */

export const updateActionPlan =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await updateActionPlanService(
          req.params.actionPlanId,
          req.body,
          req.user
        );

      return sendSuccessResponse(
        res,
        200,
        "Action Plan updated successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE ACTION PLAN STATUS
   ========================================================= */

export const updateActionPlanStatus =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await updateActionPlanStatusService(
          req.params.actionPlanId,
          req.body.status,
          req.user
        );

      return sendSuccessResponse(
        res,
        200,
        "Action Plan status updated successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE ACTION PLAN
   ========================================================= */

export const deleteActionPlan =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await deleteActionPlanService(
          req.params.actionPlanId
        );

      return sendSuccessResponse(
        res,
        200,
        "Action Plan deleted successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };
