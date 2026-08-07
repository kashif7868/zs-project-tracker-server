/* =========================================================
   ALLOWED VALUES
   ========================================================= */

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

const progressFields = [
  "overall",
  "rectification",
  "evidence",
  "testing",
  "actionPlan",
];

/* =========================================================
   HELPERS
   ========================================================= */

const isObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
};

const isValidPercentage = (value) => {
  const numberValue =
    Number(value);

  return (
    Number.isFinite(numberValue) &&
    numberValue >= 0 &&
    numberValue <= 100
  );
};

const isValidNonNegativeNumber = (
  value
) => {
  const numberValue =
    Number(value);

  return (
    Number.isFinite(numberValue) &&
    numberValue >= 0
  );
};

const normalizeEnumValue = (
  value
) => {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
    : value;
};

const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
};

const sendValidationError = (
  res,
  errors
) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

/* =========================================================
   REMOVE AUTOMATIC / PROTECTED FIELDS

   Project Reference Number backend model khud generate karega.

   User in fields ko create ya update request mein control
   nahi kar sakta.
   ========================================================= */

const removeProtectedProjectFields = (
  body
) => {
  delete body.projectCode;
  delete body.projectReferenceNo;

  delete body.createdBy;
  delete body.updatedBy;

  delete body.clientAccessToken;
  delete body.clientAccessExpiresAt;
  delete body.lastClientAccessAt;
};

/* =========================================================
   VALIDATE OPTIONAL STRING
   ========================================================= */

const validateOptionalString = ({
  value,
  field,
  maximumLength,
  errors,
}) => {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string") {
    errors.push({
      field,
      message: `${field} must be a string`,
    });

    return;
  }

  if (
    value.trim().length >
    maximumLength
  ) {
    errors.push({
      field,
      message:
        `${field} cannot exceed ${maximumLength} characters`,
    });
  }
};

/* =========================================================
   VALIDATE CLIENT

   Create par name required hai.
   Update par sirf supplied fields validate hongi.
   ========================================================= */

const validateClient = ({
  client,
  required,
  errors,
}) => {
  if (
    client === undefined &&
    !required
  ) {
    return;
  }

  if (!isObject(client)) {
    errors.push({
      field: "client",
      message:
        "Client information must be an object",
    });

    return;
  }

  if (
    required &&
    (
      typeof client.name !==
        "string" ||
      !client.name.trim()
    )
  ) {
    errors.push({
      field: "client.name",
      message:
        "Client name is required",
    });
  }

  if (
    client.name !== undefined
  ) {
    if (
      typeof client.name !==
      "string"
    ) {
      errors.push({
        field: "client.name",
        message:
          "Client name must be a string",
      });
    } else if (
      !client.name.trim()
    ) {
      errors.push({
        field: "client.name",
        message:
          "Client name cannot be empty",
      });
    } else if (
      client.name.trim().length >
      200
    ) {
      errors.push({
        field: "client.name",
        message:
          "Client name cannot exceed 200 characters",
      });
    }
  }

  validateOptionalString({
    value: client.company,
    field: "client.company",
    maximumLength: 200,
    errors,
  });

  validateOptionalString({
    value: client.phone,
    field: "client.phone",
    maximumLength: 50,
    errors,
  });

  if (
    client.email !== undefined
  ) {
    if (
      typeof client.email !==
      "string"
    ) {
      errors.push({
        field: "client.email",
        message:
          "Client email must be a string",
      });
    } else if (
      client.email.trim() &&
      !isValidEmail(
        client.email.trim()
      )
    ) {
      errors.push({
        field: "client.email",
        message:
          "Client email is invalid",
      });
    } else if (
      client.email.trim().length >
      320
    ) {
      errors.push({
        field: "client.email",
        message:
          "Client email cannot exceed 320 characters",
      });
    }
  }
};

/* =========================================================
   VALIDATE SITE

   Create par name aur location required hain.
   Update par sirf supplied fields validate hongi.
   ========================================================= */

const validateSite = ({
  site,
  required,
  errors,
}) => {
  if (
    site === undefined &&
    !required
  ) {
    return;
  }

  if (!isObject(site)) {
    errors.push({
      field: "site",
      message:
        "Site information must be an object",
    });

    return;
  }

  if (
    required &&
    (
      typeof site.name !==
        "string" ||
      !site.name.trim()
    )
  ) {
    errors.push({
      field: "site.name",
      message:
        "Site name is required",
    });
  }

  if (
    required &&
    (
      typeof site.location !==
        "string" ||
      !site.location.trim()
    )
  ) {
    errors.push({
      field: "site.location",
      message:
        "Site location is required",
    });
  }

  if (
    site.name !== undefined
  ) {
    if (
      typeof site.name !==
      "string"
    ) {
      errors.push({
        field: "site.name",
        message:
          "Site name must be a string",
      });
    } else if (
      !site.name.trim()
    ) {
      errors.push({
        field: "site.name",
        message:
          "Site name cannot be empty",
      });
    } else if (
      site.name.trim().length >
      200
    ) {
      errors.push({
        field: "site.name",
        message:
          "Site name cannot exceed 200 characters",
      });
    }
  }

  if (
    site.location !== undefined
  ) {
    if (
      typeof site.location !==
      "string"
    ) {
      errors.push({
        field: "site.location",
        message:
          "Site location must be a string",
      });
    } else if (
      !site.location.trim()
    ) {
      errors.push({
        field: "site.location",
        message:
          "Site location cannot be empty",
      });
    } else if (
      site.location
        .trim()
        .length > 500
    ) {
      errors.push({
        field: "site.location",
        message:
          "Site location cannot exceed 500 characters",
      });
    }
  }

  validateOptionalString({
    value: site.city,
    field: "site.city",
    maximumLength: 100,
    errors,
  });

  validateOptionalString({
    value: site.province,
    field: "site.province",
    maximumLength: 100,
    errors,
  });

  validateOptionalString({
    value: site.country,
    field: "site.country",
    maximumLength: 100,
    errors,
  });
};

/* =========================================================
   VALIDATE PROGRESS
   ========================================================= */

const validateProgress = (
  progress,
  errors
) => {
  if (
    progress === undefined
  ) {
    return;
  }

  if (!isObject(progress)) {
    errors.push({
      field: "progress",
      message:
        "Progress must be an object",
    });

    return;
  }

  progressFields.forEach(
    (field) => {
      if (
        progress[field] !==
          undefined &&
        !isValidPercentage(
          progress[field]
        )
      ) {
        errors.push({
          field:
            `progress.${field}`,

          message:
            `${field} progress must be between 0 and 100`,
        });
      }
    }
  );
};

/* =========================================================
   VALIDATE PROJECT SETTINGS

   riskRegisterIdEnabled:

   false → Risk Register ID frontend par hidden
   true  → Risk Register ID frontend par visible
   ========================================================= */

const validateSettings = (
  settings,
  errors
) => {
  if (
    settings === undefined
  ) {
    return;
  }

  if (!isObject(settings)) {
    errors.push({
      field: "settings",
      message:
        "Project settings must be an object",
    });

    return;
  }

  if (
    settings
      .riskRegisterIdEnabled !==
      undefined &&
    typeof settings
      .riskRegisterIdEnabled !==
      "boolean"
  ) {
    errors.push({
      field:
        "settings.riskRegisterIdEnabled",

      message:
        "Risk Register ID setting must be true or false",
    });
  }
};

/* =========================================================
   CREATE PROJECT VALIDATION
   ========================================================= */

export const validateCreateProject = (
  req,
  res,
  next
) => {
  const errors = [];

  if (!isObject(req.body)) {
    return sendValidationError(
      res,
      [
        {
          field: "body",
          message:
            "Project data is required",
        },
      ]
    );
  }

  removeProtectedProjectFields(
    req.body
  );

  const {
    title,
    description,
    projectType,
    client,
    site,
    systemCapacityKW,
    auditDate,
    startDate,
    expectedCompletionDate,
    actualCompletionDate,
    status,
    overallRiskLevel,
    progress,
    settings,
    notes,
  } = req.body;

  /* =======================================================
     TITLE
     ======================================================= */

  if (
    typeof title !== "string" ||
    !title.trim()
  ) {
    errors.push({
      field: "title",
      message:
        "Project title is required",
    });
  } else if (
    title.trim().length > 200
  ) {
    errors.push({
      field: "title",
      message:
        "Project title cannot exceed 200 characters",
    });
  }

  /* =======================================================
     OPTIONAL TEXT
     ======================================================= */

  validateOptionalString({
    value: description,
    field: "description",
    maximumLength: 2000,
    errors,
  });

  validateOptionalString({
    value: notes,
    field: "notes",
    maximumLength: 3000,
    errors,
  });

  /* =======================================================
     ENUM VALUES
     ======================================================= */

  if (
    projectType !== undefined
  ) {
    const normalizedProjectType =
      normalizeEnumValue(
        projectType
      );

    if (
      !projectTypes.includes(
        normalizedProjectType
      )
    ) {
      errors.push({
        field: "projectType",
        message:
          "Invalid project type",
      });
    } else {
      req.body.projectType =
        normalizedProjectType;
    }
  }

  if (
    status !== undefined
  ) {
    const normalizedStatus =
      normalizeEnumValue(status);

    if (
      !projectStatuses.includes(
        normalizedStatus
      )
    ) {
      errors.push({
        field: "status",
        message:
          "Invalid project status",
      });
    } else {
      req.body.status =
        normalizedStatus;
    }
  }

  if (
    overallRiskLevel !==
    undefined
  ) {
    const normalizedRiskLevel =
      normalizeEnumValue(
        overallRiskLevel
      );

    if (
      !riskLevels.includes(
        normalizedRiskLevel
      )
    ) {
      errors.push({
        field:
          "overallRiskLevel",

        message:
          "Invalid overall risk level",
      });
    } else {
      req.body.overallRiskLevel =
        normalizedRiskLevel;
    }
  }

  /* =======================================================
     CLIENT AND SITE
     ======================================================= */

  validateClient({
    client,
    required: true,
    errors,
  });

  validateSite({
    site,
    required: true,
    errors,
  });

  /* =======================================================
     CAPACITY
     ======================================================= */

  if (
    systemCapacityKW !==
      undefined &&
    !isValidNonNegativeNumber(
      systemCapacityKW
    )
  ) {
    errors.push({
      field:
        "systemCapacityKW",

      message:
        "System capacity cannot be negative",
    });
  }

  /* =======================================================
     DATES
     ======================================================= */

  if (
    auditDate !== undefined &&
    auditDate !== null &&
    !isValidDate(auditDate)
  ) {
    errors.push({
      field: "auditDate",
      message:
        "Audit date is invalid",
    });
  }

  if (
    !isValidDate(startDate)
  ) {
    errors.push({
      field: "startDate",
      message:
        "A valid project start date is required",
    });
  }

  if (
    !isValidDate(
      expectedCompletionDate
    )
  ) {
    errors.push({
      field:
        "expectedCompletionDate",

      message:
        "A valid expected completion date is required",
    });
  }

  if (
    isValidDate(startDate) &&
    isValidDate(
      expectedCompletionDate
    ) &&
    new Date(
      expectedCompletionDate
    ) < new Date(startDate)
  ) {
    errors.push({
      field:
        "expectedCompletionDate",

      message:
        "Expected completion date cannot be earlier than start date",
    });
  }

  if (
    actualCompletionDate !==
      undefined &&
    actualCompletionDate !==
      null &&
    !isValidDate(
      actualCompletionDate
    )
  ) {
    errors.push({
      field:
        "actualCompletionDate",

      message:
        "Actual completion date is invalid",
    });
  }

  if (
    isValidDate(startDate) &&
    actualCompletionDate &&
    isValidDate(
      actualCompletionDate
    ) &&
    new Date(
      actualCompletionDate
    ) < new Date(startDate)
  ) {
    errors.push({
      field:
        "actualCompletionDate",

      message:
        "Actual completion date cannot be earlier than start date",
    });
  }

  /* =======================================================
     PROGRESS AND SETTINGS
     ======================================================= */

  validateProgress(
    progress,
    errors
  );

  validateSettings(
    settings,
    errors
  );

  if (
    errors.length > 0
  ) {
    return sendValidationError(
      res,
      errors
    );
  }

  return next();
};

/* =========================================================
   UPDATE PROJECT VALIDATION
   ========================================================= */

export const validateUpdateProject = (
  req,
  res,
  next
) => {
  const errors = [];

  if (!isObject(req.body)) {
    return sendValidationError(
      res,
      [
        {
          field: "body",
          message:
            "Project update data is required",
        },
      ]
    );
  }

  removeProtectedProjectFields(
    req.body
  );

  const {
    title,
    description,
    projectType,
    client,
    site,
    status,
    overallRiskLevel,
    startDate,
    expectedCompletionDate,
    actualCompletionDate,
    auditDate,
    progress,
    settings,
    systemCapacityKW,
    notes,
  } = req.body;

  /* =======================================================
     TITLE
     ======================================================= */

  if (
    title !== undefined
  ) {
    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      errors.push({
        field: "title",
        message:
          "Project title cannot be empty",
      });
    } else if (
      title.trim().length > 200
    ) {
      errors.push({
        field: "title",
        message:
          "Project title cannot exceed 200 characters",
      });
    }
  }

  /* =======================================================
     OPTIONAL TEXT
     ======================================================= */

  validateOptionalString({
    value: description,
    field: "description",
    maximumLength: 2000,
    errors,
  });

  validateOptionalString({
    value: notes,
    field: "notes",
    maximumLength: 3000,
    errors,
  });

  /* =======================================================
     ENUM VALUES
     ======================================================= */

  if (
    projectType !== undefined
  ) {
    const normalizedProjectType =
      normalizeEnumValue(
        projectType
      );

    if (
      !projectTypes.includes(
        normalizedProjectType
      )
    ) {
      errors.push({
        field: "projectType",
        message:
          "Invalid project type",
      });
    } else {
      req.body.projectType =
        normalizedProjectType;
    }
  }

  if (
    status !== undefined
  ) {
    const normalizedStatus =
      normalizeEnumValue(status);

    if (
      !projectStatuses.includes(
        normalizedStatus
      )
    ) {
      errors.push({
        field: "status",
        message:
          "Invalid project status",
      });
    } else {
      req.body.status =
        normalizedStatus;
    }
  }

  if (
    overallRiskLevel !==
    undefined
  ) {
    const normalizedRiskLevel =
      normalizeEnumValue(
        overallRiskLevel
      );

    if (
      !riskLevels.includes(
        normalizedRiskLevel
      )
    ) {
      errors.push({
        field:
          "overallRiskLevel",

        message:
          "Invalid overall risk level",
      });
    } else {
      req.body.overallRiskLevel =
        normalizedRiskLevel;
    }
  }

  /* =======================================================
     CLIENT AND SITE PARTIAL UPDATE
     ======================================================= */

  validateClient({
    client,
    required: false,
    errors,
  });

  validateSite({
    site,
    required: false,
    errors,
  });

  /* =======================================================
     CAPACITY
     ======================================================= */

  if (
    systemCapacityKW !==
      undefined &&
    !isValidNonNegativeNumber(
      systemCapacityKW
    )
  ) {
    errors.push({
      field:
        "systemCapacityKW",

      message:
        "System capacity cannot be negative",
    });
  }

  /* =======================================================
     DATES
     ======================================================= */

  if (
    auditDate !== undefined &&
    auditDate !== null &&
    !isValidDate(auditDate)
  ) {
    errors.push({
      field: "auditDate",
      message:
        "Audit date is invalid",
    });
  }

  if (
    startDate !== undefined &&
    !isValidDate(startDate)
  ) {
    errors.push({
      field: "startDate",
      message:
        "Start date is invalid",
    });
  }

  if (
    expectedCompletionDate !==
      undefined &&
    !isValidDate(
      expectedCompletionDate
    )
  ) {
    errors.push({
      field:
        "expectedCompletionDate",

      message:
        "Expected completion date is invalid",
    });
  }

  if (
    actualCompletionDate !==
      undefined &&
    actualCompletionDate !==
      null &&
    !isValidDate(
      actualCompletionDate
    )
  ) {
    errors.push({
      field:
        "actualCompletionDate",

      message:
        "Actual completion date is invalid",
    });
  }

  if (
    startDate !== undefined &&
    expectedCompletionDate !==
      undefined &&
    isValidDate(startDate) &&
    isValidDate(
      expectedCompletionDate
    ) &&
    new Date(
      expectedCompletionDate
    ) < new Date(startDate)
  ) {
    errors.push({
      field:
        "expectedCompletionDate",

      message:
        "Expected completion date cannot be earlier than start date",
    });
  }

  if (
    startDate !== undefined &&
    actualCompletionDate &&
    isValidDate(startDate) &&
    isValidDate(
      actualCompletionDate
    ) &&
    new Date(
      actualCompletionDate
    ) < new Date(startDate)
  ) {
    errors.push({
      field:
        "actualCompletionDate",

      message:
        "Actual completion date cannot be earlier than start date",
    });
  }

  /* =======================================================
     PROGRESS AND SETTINGS
     ======================================================= */

  validateProgress(
    progress,
    errors
  );

  validateSettings(
    settings,
    errors
  );

  if (
    errors.length > 0
  ) {
    return sendValidationError(
      res,
      errors
    );
  }

  return next();
};