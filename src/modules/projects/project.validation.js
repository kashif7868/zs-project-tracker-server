const projectTypes = [
  "electrical_audit",
  "energy_audit",
  "risk_rectification",
  "solar_installation",
  "testing_commissioning",
  "other",
];

const projectStatuses = [
  "draft",
  "active",
  "on_hold",
  "awaiting_verification",
  "completed",
  "archived",
];

const riskLevels = [
  "low",
  "medium",
  "high",
  "critical",
  "high_to_critical",
];

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const isValidPercentage = (value) => {
  const numberValue = Number(value);

  return (
    Number.isFinite(numberValue) &&
    numberValue >= 0 &&
    numberValue <= 100
  );
};

const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

export const validateCreateProject = (req, res, next) => {
  const errors = [];

  const {
    projectCode,
    title,
    projectType,
    client,
    site,
    startDate,
    expectedCompletionDate,
    overallRiskLevel,
    progress,
  } = req.body;

  if (!projectCode || typeof projectCode !== "string") {
    errors.push({
      field: "projectCode",
      message: "Project code is required",
    });
  }

  if (!title || typeof title !== "string") {
    errors.push({
      field: "title",
      message: "Project title is required",
    });
  }

  if (title && title.trim().length > 200) {
    errors.push({
      field: "title",
      message: "Project title cannot exceed 200 characters",
    });
  }

  if (projectType && !projectTypes.includes(projectType)) {
    errors.push({
      field: "projectType",
      message: "Invalid project type",
    });
  }

  if (!client || typeof client !== "object") {
    errors.push({
      field: "client",
      message: "Client information is required",
    });
  } else {
    if (!client.name || typeof client.name !== "string") {
      errors.push({
        field: "client.name",
        message: "Client name is required",
      });
    }

    if (
      client.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)
    ) {
      errors.push({
        field: "client.email",
        message: "Client email is invalid",
      });
    }
  }

  if (!site || typeof site !== "object") {
    errors.push({
      field: "site",
      message: "Site information is required",
    });
  } else {
    if (!site.name || typeof site.name !== "string") {
      errors.push({
        field: "site.name",
        message: "Site name is required",
      });
    }

    if (!site.location || typeof site.location !== "string") {
      errors.push({
        field: "site.location",
        message: "Site location is required",
      });
    }
  }

  if (!startDate || !isValidDate(startDate)) {
    errors.push({
      field: "startDate",
      message: "A valid project start date is required",
    });
  }

  if (
    !expectedCompletionDate ||
    !isValidDate(expectedCompletionDate)
  ) {
    errors.push({
      field: "expectedCompletionDate",
      message: "A valid expected completion date is required",
    });
  }

  if (
    isValidDate(startDate) &&
    isValidDate(expectedCompletionDate) &&
    new Date(expectedCompletionDate) < new Date(startDate)
  ) {
    errors.push({
      field: "expectedCompletionDate",
      message:
        "Expected completion date cannot be earlier than start date",
    });
  }

  if (
    overallRiskLevel &&
    !riskLevels.includes(overallRiskLevel)
  ) {
    errors.push({
      field: "overallRiskLevel",
      message: "Invalid overall risk level",
    });
  }

  if (progress && typeof progress === "object") {
    const progressFields = [
      "overall",
      "rectification",
      "evidence",
      "testing",
      "actionPlan",
    ];

    progressFields.forEach((field) => {
      if (
        progress[field] !== undefined &&
        !isValidPercentage(progress[field])
      ) {
        errors.push({
          field: `progress.${field}`,
          message: `${field} progress must be between 0 and 100`,
        });
      }
    });
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};

export const validateUpdateProject = (req, res, next) => {
  const errors = [];

  const {
    title,
    projectType,
    status,
    overallRiskLevel,
    startDate,
    expectedCompletionDate,
    actualCompletionDate,
    progress,
    systemCapacityKW,
  } = req.body;

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      errors.push({
        field: "title",
        message: "Project title cannot be empty",
      });
    }

    if (typeof title === "string" && title.trim().length > 200) {
      errors.push({
        field: "title",
        message: "Project title cannot exceed 200 characters",
      });
    }
  }

  if (
    projectType !== undefined &&
    !projectTypes.includes(projectType)
  ) {
    errors.push({
      field: "projectType",
      message: "Invalid project type",
    });
  }

  if (
    status !== undefined &&
    !projectStatuses.includes(status)
  ) {
    errors.push({
      field: "status",
      message: "Invalid project status",
    });
  }

  if (
    overallRiskLevel !== undefined &&
    !riskLevels.includes(overallRiskLevel)
  ) {
    errors.push({
      field: "overallRiskLevel",
      message: "Invalid overall risk level",
    });
  }

  if (startDate !== undefined && !isValidDate(startDate)) {
    errors.push({
      field: "startDate",
      message: "Start date is invalid",
    });
  }

  if (
    expectedCompletionDate !== undefined &&
    !isValidDate(expectedCompletionDate)
  ) {
    errors.push({
      field: "expectedCompletionDate",
      message: "Expected completion date is invalid",
    });
  }

  if (
    actualCompletionDate !== undefined &&
    actualCompletionDate !== null &&
    !isValidDate(actualCompletionDate)
  ) {
    errors.push({
      field: "actualCompletionDate",
      message: "Actual completion date is invalid",
    });
  }

  if (
    startDate !== undefined &&
    expectedCompletionDate !== undefined &&
    isValidDate(startDate) &&
    isValidDate(expectedCompletionDate) &&
    new Date(expectedCompletionDate) < new Date(startDate)
  ) {
    errors.push({
      field: "expectedCompletionDate",
      message:
        "Expected completion date cannot be earlier than start date",
    });
  }

  if (
    systemCapacityKW !== undefined &&
    (Number.isNaN(Number(systemCapacityKW)) ||
      Number(systemCapacityKW) < 0)
  ) {
    errors.push({
      field: "systemCapacityKW",
      message: "System capacity cannot be negative",
    });
  }

  if (progress !== undefined) {
    if (!progress || typeof progress !== "object") {
      errors.push({
        field: "progress",
        message: "Progress must be an object",
      });
    } else {
      const progressFields = [
        "overall",
        "rectification",
        "evidence",
        "testing",
        "actionPlan",
      ];

      progressFields.forEach((field) => {
        if (
          progress[field] !== undefined &&
          !isValidPercentage(progress[field])
        ) {
          errors.push({
            field: `progress.${field}`,
            message: `${field} progress must be between 0 and 100`,
          });
        }
      });
    }
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  next();
};