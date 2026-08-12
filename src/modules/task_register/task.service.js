import mongoose from "mongoose";

import Task, {
  TaskSerialCounter,
} from "../../models/task_register/task.model.js";

/* =========================================================
   CONSTANTS
   ========================================================= */

const TASK_STATUSES = [
  "in_progress",
  "complete",
];

const TASK_SORT_FIELDS = [
  "serialNo",
  "riskRegisterId",
  "projectCode",
  "description",
  "status",
  "createdAt",
  "updatedAt",
];

const EVIDENCE_COLLECTION_NAME =
  "risk_evidences";

const SERIAL_CREATION_RETRY_LIMIT = 25;

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  statusCode,
  message
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = statusCode;

  return error;
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const hasOwnField = (
  object,
  field
) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    field
  );
};

const validateMongoId = (
  value,
  fieldName
) => {
  if (
    !mongoose.isValidObjectId(
      value
    )
  ) {
    throw createServiceError(
      400,
      `${fieldName} is invalid.`
    );
  }
};

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeTaskStatus = (
  status
) => {
  const normalizedStatus =
    normalizeText(
      status
    ).toLowerCase();

  if (
    !TASK_STATUSES.includes(
      normalizedStatus
    )
  ) {
    throw createServiceError(
      400,
      "Status must be in_progress or complete."
    );
  }

  return normalizedStatus;
};

const attachTaskMeta = (
  task
) => {
  return {
    ...task,

    /*
      Canonical application name.
      Physical MongoDB field riskRegisterId is temporarily
      preserved by task.model.js for existing data.
    */
    taskRegisterId:
      task?.taskRegisterId ||
      task?.riskRegisterId ||
      undefined,
  };
};

/* =========================================================
   DUPLICATE HELPERS
   ========================================================= */

const getDuplicateFields = (
  error
) => {
  if (
    error?.code !== 11000
  ) {
    return [];
  }

  return Object.keys(
    error.keyPattern ||
      error.keyValue ||
      {}
  );
};

const isDuplicateField = (
  error,
  field
) => {
  return getDuplicateFields(
    error
  ).includes(field);
};

const handleDuplicateTaskError = (
  error
) => {
  if (
    error?.code !== 11000
  ) {
    throw error;
  }

  const duplicateFields =
    getDuplicateFields(
      error
    );

  if (
    duplicateFields.includes(
      "serialNo"
    )
  ) {
    throw createServiceError(
      409,
      "Task serial number allocation conflict occurred. Please try again."
    );
  }

  if (
    duplicateFields.includes(
      "riskRegisterId"
    )
  ) {
    throw createServiceError(
      409,
      "This Task Register ID already exists in the selected project."
    );
  }

  throw createServiceError(
    409,
    "A duplicate Task record already exists."
  );
};

/* =========================================================
   PROJECT HELPERS
   ========================================================= */

const getProjectModel = () => {
  const Project =
    mongoose.models.Project;

  if (!Project) {
    throw createServiceError(
      500,
      "Project model is not registered."
    );
  }

  return Project;
};

const fetchProjectDetails = async (
  projectId
) => {
  validateMongoId(
    projectId,
    "Project ID"
  );

  const Project =
    getProjectModel();

  const project =
    await Project.findById(
      projectId
    )
      .select(
        [
          "_id",
          "projectCode",
          "code",
          "settings.taskRegisterIdEnabled",
          "settings.taskRegisterIdEnabled",
        ].join(" ")
      )
      .lean();

  if (!project) {
    throw createServiceError(
      404,
      "Selected project was not found."
    );
  }

  const projectCode =
    normalizeText(
      project.projectCode ||
        project.code
    ).toUpperCase();

  if (!projectCode) {
    throw createServiceError(
      400,
      "Selected project does not have a Project Reference Number."
    );
  }

  return {
    projectId:
      project._id,

    projectCode,

    taskRegisterIdEnabled:
      project.settings
        ?.taskRegisterIdEnabled ===
        true ||
      project.settings
        ?.taskRegisterIdEnabled ===
        true,
  };
};

/* =========================================================
   TASK REGISTER ID CONTROL

   Disabled:

   - New Risk Register ID cannot be supplied.
   - Existing saved value remains preserved.
   - Existing value cannot be changed or removed.

   Enabled:

   - Field is available.
   - Field remains optional.
   ========================================================= */

const validateTaskRegisterIdSetting = ({
  project,
  fieldProvided,
  taskRegisterId,
}) => {
  if (!fieldProvided) {
    return;
  }

  if (
    !project
      .taskRegisterIdEnabled
  ) {
    throw createServiceError(
      400,
      "Task Register ID is disabled for this project."
    );
  }

  const normalizedValue =
    normalizeText(
      taskRegisterId
    );

  if (
    normalizedValue.length >
    100
  ) {
    throw createServiceError(
      400,
      "Task Register ID cannot exceed 100 characters."
    );
  }
};

/* =========================================================
   SERIAL COUNTER SYNCHRONIZATION

   Existing serialNo values Number ya old String format mein
   ho sakti hain.

   Example:

   "001"
   "25"
   120

   Aggregation un values ko integer mein convert karke project
   ka maximum serial calculate karegi.

   Counter kabhi peeche nahi jayega because $max use ho raha hai.
   ========================================================= */

const synchronizeTaskSerialCounter =
  async (projectId) => {
    validateMongoId(
      projectId,
      "Project ID"
    );

    const projectObjectId =
      new mongoose.Types.ObjectId(
        projectId
      );

    const maximumSerialResult =
      await Task.collection
        .aggregate([
          {
            $match: {
              projectId:
                projectObjectId,
            },
          },
          {
            $project: {
              convertedSerial: {
                $convert: {
                  input:
                    "$serialNo",

                  to:
                    "int",

                  onError:
                    null,

                  onNull:
                    null,
                },
              },
            },
          },
          {
            $match: {
              convertedSerial: {
                $ne: null,
              },
            },
          },
          {
            $group: {
              _id: null,

              maximumSerial: {
                $max:
                  "$convertedSerial",
              },
            },
          },
        ])
        .toArray();

    const maximumSerial =
      Number(
        maximumSerialResult[0]
          ?.maximumSerial ||
          0
      );

    if (
      !Number.isInteger(
        maximumSerial
      ) ||
      maximumSerial < 1
    ) {
      return;
    }

    await TaskSerialCounter.updateOne(
      {
        projectId:
          projectObjectId,
      },
      {
        $max: {
          sequence:
            maximumSerial,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  };


/* =========================================================
   EVIDENCE COLLECTION
   ========================================================= */

const getEvidenceCollection = () => {
  return mongoose.connection.collection(
    EVIDENCE_COLLECTION_NAME
  );
};

/* =========================================================
   EMPTY EVIDENCE SUMMARY
   ========================================================= */

const getEmptyEvidenceSummary = () => {
  return {
    before: [],
    after: [],

    beforeCount: 0,
    afterCount: 0,

    canMarkComplete: false,
  };
};

/* =========================================================
   SINGLE RISK EVIDENCE SUMMARY
   ========================================================= */

export const getTaskEvidenceSummary =
  async (taskId) => {
    validateMongoId(
      taskId,
      "Task ID"
    );

    const evidenceCollection =
      getEvidenceCollection();

    const taskObjectId =
      new mongoose.Types.ObjectId(
        taskId
      );

    const summary =
      await evidenceCollection
        .aggregate([
          {
            $match: {
              taskId:
                taskObjectId,
            },
          },
          {
            $group: {
              _id:
                "$evidenceType",

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray();

    const evidenceSummary =
      getEmptyEvidenceSummary();

    summary.forEach(
      (item) => {
        if (
          item._id ===
          "before"
        ) {
          evidenceSummary.beforeCount =
            item.count;
        }

        if (
          item._id ===
          "after"
        ) {
          evidenceSummary.afterCount =
            item.count;
        }
      }
    );

    evidenceSummary.canMarkComplete =
      evidenceSummary.beforeCount >
        0 &&
      evidenceSummary.afterCount >
        0;

    return evidenceSummary;
  };

/* =========================================================
   MULTIPLE RISKS EVIDENCE SUMMARY
   ========================================================= */

const getEvidenceSummaryMap = async (
  taskIds
) => {
  const summaryMap =
    new Map();

  if (
    !Array.isArray(
      taskIds
    ) ||
    taskIds.length === 0
  ) {
    return summaryMap;
  }

  const evidenceCollection =
    getEvidenceCollection();

  const summary =
    await evidenceCollection
      .aggregate([
        {
          $match: {
            riskId: {
              $in:
                taskIds,
            },
          },
        },
        {
          $group: {
            _id: {
              taskId:
                "$riskId",

              evidenceType:
                "$evidenceType",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ])
      .toArray();

  summary.forEach(
    (item) => {
      const taskId =
        item._id.taskId.toString();

      const currentSummary =
        summaryMap.get(
          taskId
        ) ||
        getEmptyEvidenceSummary();

      if (
        item._id
          .evidenceType ===
        "before"
      ) {
        currentSummary.beforeCount =
          item.count;
      }

      if (
        item._id
          .evidenceType ===
        "after"
      ) {
        currentSummary.afterCount =
          item.count;
      }

      currentSummary.canMarkComplete =
        currentSummary.beforeCount >
          0 &&
        currentSummary.afterCount >
          0;

      summaryMap.set(
        taskId,
        currentSummary
      );
    }
  );

  return summaryMap;
};

/* =========================================================
   COMPLETE BEFORE/AFTER EVIDENCE
   ========================================================= */

export const getTaskEvidence =
  async (taskId) => {
    validateMongoId(
      taskId,
      "Task ID"
    );

    const evidenceCollection =
      getEvidenceCollection();

    const evidenceRecords =
      await evidenceCollection
        .find({
          riskId:
            new mongoose.Types.ObjectId(
              taskId
            ),
        })
        .sort({
          createdAt: 1,
        })
        .toArray();

    const before = [];
    const after = [];

    evidenceRecords.forEach(
      (record) => {
        if (
          record.evidenceType ===
          "before"
        ) {
          before.push(
            record
          );
        }

        if (
          record.evidenceType ===
          "after"
        ) {
          after.push(
            record
          );
        }
      }
    );

    return {
      before,
      after,

      beforeCount:
        before.length,

      afterCount:
        after.length,

      canMarkComplete:
        before.length > 0 &&
        after.length > 0,
    };
  };

/* =========================================================
   CREATE TASK

   Allowed:
   projectId
   description
   taskRegisterId optional

   Compatibility:
   riskRegisterId is temporarily accepted as a legacy input.

   Backend automatically:
   serialNo
   projectCode
   status = in_progress
   createdAt
   updatedAt
   ========================================================= */

export const createTaskService =
  async (payload = {}) => {
    const {
      projectId,
      description,
    } = payload;

    if (
      hasOwnField(
        payload,
        "serialNo"
      )
    ) {
      throw createServiceError(
        400,
        "Serial number is generated automatically and cannot be supplied."
      );
    }

    if (
      hasOwnField(
        payload,
        "status"
      )
    ) {
      throw createServiceError(
        400,
        "New tasks automatically start with in_progress status."
      );
    }

    const project =
      await fetchProjectDetails(
        projectId
      );

    const taskRegisterIdFieldProvided =
      hasOwnField(
        payload,
        "taskRegisterId"
      ) ||
      hasOwnField(
        payload,
        "riskRegisterId"
      );

    const rawTaskRegisterId =
      hasOwnField(
        payload,
        "taskRegisterId"
      )
        ? payload.taskRegisterId
        : payload.riskRegisterId;

    const normalizedTaskRegisterId =
      normalizeText(
        rawTaskRegisterId
      );

    const taskRegisterIdProvided =
      taskRegisterIdFieldProvided &&
      Boolean(
        normalizedTaskRegisterId
      );

    validateTaskRegisterIdSetting({
      project,
      fieldProvided:
        taskRegisterIdProvided,
      taskRegisterId:
        rawTaskRegisterId,
    });

    const normalizedDescription =
      normalizeText(
        description
      );

    if (
      normalizedDescription.length <
      3
    ) {
      throw createServiceError(
        400,
        "Task description must contain at least 3 characters."
      );
    }

    if (
      normalizedDescription.length >
      3000
    ) {
      throw createServiceError(
        400,
        "Task description cannot exceed 3000 characters."
      );
    }

    await synchronizeTaskSerialCounter(
      project.projectId
    );

    for (
      let attempt = 1;
      attempt <=
      SERIAL_CREATION_RETRY_LIMIT;
      attempt += 1
    ) {
      try {
        const task =
          await Task.create({
            projectId:
              project.projectId,

            projectCode:
              project.projectCode,

            ...(taskRegisterIdProvided
              ? {
                  taskRegisterId:
                    normalizedTaskRegisterId.toUpperCase(),
                }
              : {}),

            description:
              normalizedDescription,

            status:
              "in_progress",
          });

        return {
          task:
            attachTaskMeta(
              task.toObject()
            ),

          evidence:
            getEmptyEvidenceSummary(),
        };
      } catch (error) {
        const serialConflict =
          isDuplicateField(
            error,
            "serialNo"
          );

        if (
          serialConflict &&
          attempt <
            SERIAL_CREATION_RETRY_LIMIT
        ) {
          await synchronizeTaskSerialCounter(
            project.projectId
          );

          continue;
        }

        handleDuplicateTaskError(
          error
        );
      }
    }

    throw createServiceError(
      409,
      "Task serial number could not be allocated. Please try again."
    );
  };

/* =========================================================
   GET TASKS

   Simple Task Register filters:
   projectId
   search
   status
   pagination
   sorting

   displaySrNo is continuous for the current filtered list.
   Stored serialNo remains stable/internal.
   ========================================================= */

export const getTasksService =
  async ({
    projectId,
    search,
    status,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) => {
    const currentPage =
      Math.max(
        Number.parseInt(
          page,
          10
        ) || 1,
        1
      );

    const currentLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 20,
          1
        ),
        100
      );

    const skip =
      (currentPage - 1) *
      currentLimit;

    const filter = {};

    const normalizedProjectId =
      normalizeText(
        projectId
      );

    const normalizedSearch =
      normalizeText(
        search
      );

    const normalizedStatus =
      normalizeText(
        status
      );

    if (
      normalizedProjectId
    ) {
      validateMongoId(
        normalizedProjectId,
        "Project ID"
      );

      filter.projectId =
        new mongoose.Types.ObjectId(
          normalizedProjectId
        );
    }

    if (
      normalizedStatus
    ) {
      filter.status =
        normalizeTaskStatus(
          normalizedStatus
        );
    }

    if (
      normalizedSearch
    ) {
      const safeSearch =
        escapeRegex(
          normalizedSearch
        );

      const searchConditions = [
        {
          riskRegisterId: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },
        {
          projectCode: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },
        {
          description: {
            $regex:
              safeSearch,

            $options:
              "i",
          },
        },
      ];

      if (
        /^\d+$/.test(
          normalizedSearch
        )
      ) {
        searchConditions.unshift({
          serialNo:
            Number(
              normalizedSearch
            ),
        });
      }

      filter.$or =
        searchConditions;
    }

    const receivedSortBy =
      normalizeText(
        sortBy
      );

    const normalizedSortBy =
      TASK_SORT_FIELDS.includes(
        receivedSortBy
      )
        ? receivedSortBy
        : "createdAt";

    const normalizedSortOrder =
      normalizeText(
        sortOrder
      ).toLowerCase() ===
      "asc"
        ? 1
        : -1;

    const [
      tasks,
      totalRecords,
    ] =
      await Promise.all([
        Task.find(filter)
          .sort({
            [normalizedSortBy]:
              normalizedSortOrder,

            _id:
              normalizedSortOrder,
          })
          .skip(skip)
          .limit(
            currentLimit
          )
          .lean(),

        Task.countDocuments(
          filter
        ),
      ]);

    const taskIds =
      tasks.map(
        (task) =>
          task._id
      );

    const evidenceSummaryMap =
      await getEvidenceSummaryMap(
        taskIds
      );

    const tasksWithEvidence =
      tasks.map(
        (task, index) => {
          const evidenceSummary =
            evidenceSummaryMap.get(
              task._id.toString()
            ) ||
            getEmptyEvidenceSummary();

          return {
            ...attachTaskMeta(
              task
            ),

            displaySrNo:
              skip +
              index +
              1,

            evidenceSummary,
          };
        }
      );

    const totalPages =
      Math.max(
        Math.ceil(
          totalRecords /
            currentLimit
        ),
        1
      );

    return {
      tasks:
        tasksWithEvidence,

      pagination: {
        page:
          currentPage,

        limit:
          currentLimit,

        total:
          totalRecords,

        totalRecords,

        totalPages,

        hasNextPage:
          currentPage <
          totalPages,

        hasPreviousPage:
          currentPage > 1,
      },
    };
  };

/* =========================================================
   GET SINGLE TASK

   serialNo:
   Permanent/internal database serial. Deleted Tasks can leave
   gaps in this value.

   displaySrNo:
   Current visible Task Register position for the Project.

   Example:
   Stored serialNo = 27
   Current Project has 22 existing Tasks
   Visible displaySrNo = 22

   The same ordering used by the Task Register is followed:
   serialNo ASC, then _id ASC.
   ========================================================= */

export const getTaskByIdService =
  async (taskId) => {
    validateMongoId(
      taskId,
      "Task ID"
    );

    const task =
      await Task.findById(
        taskId
      ).lean();

    if (!task) {
      throw createServiceError(
        404,
        "Task not found."
      );
    }

    /*
      Do not modify stored serialNo.

      Build a continuous visible sequence from the currently
      existing Tasks in the same Project.
    */

    const projectTasks =
      await Task.find({
        projectId:
          task.projectId,
      })
        .select(
          "_id serialNo"
        )
        .sort({
          serialNo: 1,
          _id: 1,
        })
        .lean();

    const taskIndex =
      projectTasks.findIndex(
        (projectTask) =>
          String(
            projectTask._id
          ) ===
          String(
            task._id
          )
      );

    const displaySrNo =
      taskIndex >= 0
        ? taskIndex + 1
        : task.serialNo;

    const evidence =
      await getTaskEvidence(
        taskId
      );

    return {
      task: {
        ...attachTaskMeta(
          task
        ),

        displaySrNo,
      },

      evidence,
    };
  };

/* =========================================================
   UPDATE TASK

   Current project editable fields:
   description
   taskRegisterId optional

   Compatibility:
   riskRegisterId temporarily accepted.

   Protected:
   projectId
   projectCode
   serialNo
   status
   ========================================================= */

export const updateTaskService =
  async (
    taskId,
    updateData = {}
  ) => {
    try {
      validateMongoId(
        taskId,
        "Task ID"
      );

      const protectedFields = [
        "projectId",
        "projectCode",
        "serialNo",
        "status",
      ];

      const receivedProtectedField =
        protectedFields.find(
          (field) =>
            hasOwnField(
              updateData,
              field
            )
        );

      if (
        receivedProtectedField
      ) {
        const messages = {
          projectId:
            "A task cannot be moved to another project.",

          projectCode:
            "Project Reference Number cannot be changed from the task update endpoint.",

          serialNo:
            "Serial number is generated automatically and cannot be updated.",

          status:
            "Use the dedicated task status endpoint to update status.",
        };

        throw createServiceError(
          400,
          messages[
            receivedProtectedField
          ]
        );
      }

      const allowedFields = [
        "taskRegisterId",
        "riskRegisterId",
        "description",
      ];

      const receivedFields =
        Object.keys(
          updateData
        );

      const invalidField =
        receivedFields.find(
          (field) =>
            !allowedFields.includes(
              field
            )
        );

      if (invalidField) {
        throw createServiceError(
          400,
          `${invalidField} is not allowed while updating a task.`
        );
      }

      if (
        receivedFields.length ===
        0
      ) {
        throw createServiceError(
          400,
          "At least one task field is required."
        );
      }

      const task =
        await Task.findById(
          taskId
        );

      if (!task) {
        throw createServiceError(
          404,
          "Task not found."
        );
      }

      const project =
        await fetchProjectDetails(
          task.projectId.toString()
        );

      const taskRegisterFieldProvided =
        hasOwnField(
          updateData,
          "taskRegisterId"
        ) ||
        hasOwnField(
          updateData,
          "riskRegisterId"
        );

      if (
        taskRegisterFieldProvided
      ) {
        const rawTaskRegisterId =
          hasOwnField(
            updateData,
            "taskRegisterId"
          )
            ? updateData.taskRegisterId
            : updateData.riskRegisterId;

        validateTaskRegisterIdSetting({
          project,

          fieldProvided: true,

          taskRegisterId:
            rawTaskRegisterId,
        });

        const normalizedTaskRegisterId =
          normalizeText(
            rawTaskRegisterId
          );

        task.taskRegisterId =
          normalizedTaskRegisterId
            ? normalizedTaskRegisterId.toUpperCase()
            : undefined;
      }

      if (
        hasOwnField(
          updateData,
          "description"
        )
      ) {
        const normalizedDescription =
          normalizeText(
            updateData.description
          );

        if (
          normalizedDescription.length <
          3
        ) {
          throw createServiceError(
            400,
            "Task description must contain at least 3 characters."
          );
        }

        if (
          normalizedDescription.length >
          3000
        ) {
          throw createServiceError(
            400,
            "Task description cannot exceed 3000 characters."
          );
        }

        task.description =
          normalizedDescription;
      }

      task.projectId =
        project.projectId;

      task.projectCode =
        project.projectCode;

      await task.save();

      /*
        Evidence schema migration next step mein hogi.
        Abhi physical legacy fields preserve karke evidence
        metadata synchronize kar rahe hain.
      */

      const evidenceCollection =
        getEvidenceCollection();

      const evidenceUpdate = {
        $set: {
          projectId:
            project.projectId,

          projectCode:
            project.projectCode,

          updatedAt:
            new Date(),
        },
      };

      if (
        task.taskRegisterId
      ) {
        evidenceUpdate.$set.riskRegisterId =
          task.taskRegisterId;
      } else {
        evidenceUpdate.$unset = {
          riskRegisterId: "",
        };
      }

      await evidenceCollection.updateMany(
        {
          riskId:
            task._id,
        },
        evidenceUpdate
      );

      const evidence =
        await getTaskEvidence(
          taskId
        );

      return {
        task:
          attachTaskMeta(
            task.toObject()
          ),

        evidence,
      };
    } catch (error) {
      handleDuplicateTaskError(
        error
      );
    }
  };

/* =========================================================
   UPDATE TASK STATUS

   Current lifecycle:
   in_progress
   complete

   Complete requires:
   >= 1 Before Evidence
   >= 1 After Evidence
   ========================================================= */

export const updateTaskStatusService =
  async (
    taskId,
    requestedStatus
  ) => {
    validateMongoId(
      taskId,
      "Task ID"
    );

    const status =
      normalizeTaskStatus(
        requestedStatus
      );

    const task =
      await Task.findById(
        taskId
      );

    if (!task) {
      throw createServiceError(
        404,
        "Task not found."
      );
    }

    const evidence =
      await getTaskEvidence(
        taskId
      );

    if (
      status === "complete" &&
      !evidence.canMarkComplete
    ) {
      throw createServiceError(
        400,
        "Task cannot be marked Complete until at least one Before image and one After image are uploaded."
      );
    }

    task.status =
      status;

    await task.save();

    return {
      task:
        attachTaskMeta(
          task.toObject()
        ),

      evidence,
    };
  };

/* =========================================================
   SYNC TASK STATUS AFTER EVIDENCE DELETE

   Complete Task se required evidence remove ho jaye to Task
   automatically In Progress ho jayega.
   ========================================================= */

export const syncTaskStatusWithEvidence =
  async (taskId) => {
    validateMongoId(
      taskId,
      "Task ID"
    );

    const task =
      await Task.findById(
        taskId
      );

    if (!task) {
      throw createServiceError(
        404,
        "Task not found."
      );
    }

    const evidence =
      await getTaskEvidence(
        taskId
      );

    if (
      task.status ===
        "complete" &&
      !evidence.canMarkComplete
    ) {
      task.status =
        "in_progress";

      await task.save();
    }

    return {
      task:
        attachTaskMeta(
          task.toObject()
        ),

      evidence,
    };
  };

/* =========================================================
   DELETE TASK

   Deletes:
   Task record
   Associated Evidence records

   Stored serialNo remains stable.
   Visible displaySrNo is generated from current list position.
   ========================================================= */

export const deleteTaskService =
  async (taskId) => {
    validateMongoId(
      taskId,
      "Task ID"
    );

    const task =
      await Task.findById(
        taskId
      );

    if (!task) {
      throw createServiceError(
        404,
        "Task not found."
      );
    }

    const projectId =
      task.projectId;

    const evidenceCollection =
      getEvidenceCollection();

    const evidenceRecords =
      await evidenceCollection
        .find({
          riskId:
            task._id,
        })
        .toArray();

    const imagePaths =
      evidenceRecords
        .map(
          (record) =>
            record.imagePath
        )
        .filter(
          (imagePath) =>
            typeof imagePath ===
              "string" &&
            imagePath.trim()
        );

    const deletedTask = {
      _id:
        task._id,

      projectId:
        task.projectId,

      projectCode:
        task.projectCode,

      serialNo:
        task.serialNo,

      taskRegisterId:
        task.taskRegisterId,

      description:
        task.description,

      status:
        task.status,

      completedAt:
        task.completedAt,

      createdAt:
        task.createdAt,

      updatedAt:
        task.updatedAt,
    };

    const evidenceDeleteResult =
      await evidenceCollection.deleteMany(
        {
          riskId:
            task._id,
        }
      );

    await task.deleteOne();

    const remainingTasks =
      await Task.countDocuments({
        projectId,
      });

    return {
      task:
        deletedTask,

      deletedEvidenceCount:
        evidenceDeleteResult
          .deletedCount ??
        0,

      remainingTasks,

      imagePaths,
    };
  };

/* =========================================================
   TEMPORARY LEGACY SERVICE ALIASES

   Remove after controllers/evidence/documents/dashboard have
   all migrated to Task terminology.
   ========================================================= */

export const createRiskService =
  createTaskService;

export const getRisksService =
  getTasksService;

export const getRiskByIdService =
  getTaskByIdService;

export const updateRiskService =
  updateTaskService;

export const updateRiskStatusService =
  updateTaskStatusService;

export const syncRiskStatusWithEvidence =
  syncTaskStatusWithEvidence;

export const deleteRiskService =
  deleteTaskService;

export const getRiskEvidenceSummary =
  getTaskEvidenceSummary;

export const getRiskEvidence =
  getTaskEvidence;

