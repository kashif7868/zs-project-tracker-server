import validator from "validator";

/* =========================================================
   HELPERS
   ========================================================= */

const isNonEmptyString = (value) => {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
};

/* =========================================================
   REGISTER VALIDATION

   Current frontend payload:

   name
   email
   password

   phone and countryCode remain optional for future use.
   ========================================================= */

export const validateRegisterInput = (data) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return "Request body is missing";
  }

  const {
    name,
    email,
    password,
    phone,
    countryCode,
  } = data;

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(password)
  ) {
    return "Name, email and password are required";
  }

  if (
    name.trim().length < 2
  ) {
    return "Name must be at least 2 characters";
  }

  if (
    name.trim().length > 150
  ) {
    return "Name cannot exceed 150 characters";
  }

  if (
    !validator.isEmail(
      email.trim()
    )
  ) {
    return "Invalid email";
  }

  if (
    password.length < 8
  ) {
    return "Password must be at least 8 characters";
  }

  if (
    phone !== undefined &&
    phone !== null &&
    String(phone).trim()
  ) {
    if (
      typeof phone !== "string" ||
      !validator.isMobilePhone(
        phone.trim(),
        "any"
      )
    ) {
      return "Invalid phone number";
    }
  }

  if (
    countryCode !== undefined &&
    countryCode !== null &&
    String(countryCode).trim()
  ) {
    if (
      typeof countryCode !== "string" ||
      !/^\+\d{1,4}$/.test(
        countryCode.trim()
      )
    ) {
      return "Invalid country code";
    }
  }

  return null;
};

/* =========================================================
   LOGIN VALIDATION
   ========================================================= */

export const validateLoginInput = (data) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return "Request body is missing";
  }

  const {
    email,
    password,
  } = data;

  if (
    !isNonEmptyString(email) ||
    !isNonEmptyString(password)
  ) {
    return "Email and password are required";
  }

  if (
    !validator.isEmail(
      email.trim()
    )
  ) {
    return "Invalid email";
  }

  return null;
};

/* =========================================================
   REFRESH TOKEN VALIDATION
   ========================================================= */

export const validateRefreshTokenInput = (data) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return "Request body is missing";
  }

  const {
    refreshToken,
  } = data;

  if (
    !isNonEmptyString(
      refreshToken
    )
  ) {
    return "Refresh token is required";
  }

  return null;
};

/* =========================================================
   CHANGE PASSWORD VALIDATION
   ========================================================= */

export const validateChangePasswordInput = (data) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return "Request body is missing";
  }

  const {
    oldPassword,
    newPassword,
    confirmPassword,
  } = data;

  if (
    !isNonEmptyString(
      oldPassword
    ) ||
    !isNonEmptyString(
      newPassword
    )
  ) {
    return "Old password and new password are required";
  }

  if (
    newPassword.length < 8
  ) {
    return "New password must be at least 8 characters";
  }

  if (
    oldPassword ===
    newPassword
  ) {
    return "New password must be different from old password";
  }

  if (
    confirmPassword &&
    newPassword !==
      confirmPassword
  ) {
    return "New password and confirm password do not match";
  }

  return null;
};

/* =========================================================
   FORGOT PASSWORD VALIDATION
   ========================================================= */

export const validateForgotPasswordInput = (data) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return "Request body is missing";
  }

  const {
    email,
  } = data;

  if (
    !isNonEmptyString(email)
  ) {
    return "Email is required";
  }

  if (
    !validator.isEmail(
      email.trim()
    )
  ) {
    return "Invalid email";
  }

  return null;
};

/* =========================================================
   RESET PASSWORD VALIDATION
   ========================================================= */

export const validateResetPasswordInput = (data) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return "Request body is missing";
  }

  const {
    newPassword,
    confirmPassword,
  } = data;

  if (
    !isNonEmptyString(
      newPassword
    )
  ) {
    return "New password is required";
  }

  if (
    newPassword.length < 8
  ) {
    return "New password must be at least 8 characters";
  }

  if (
    confirmPassword &&
    newPassword !==
      confirmPassword
  ) {
    return "New password and confirm password do not match";
  }

  return null;
};

/* =========================================================
   RESEND VERIFICATION EMAIL VALIDATION

   Verification feature is preserved for future applications.

   Current Project Tracker does not require email
   verification during registration, login or token refresh.
   ========================================================= */

export const validateResendVerificationEmailInput = (data) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return "Request body is missing";
  }

  const {
    email,
  } = data;

  if (
    !isNonEmptyString(email)
  ) {
    return "Email is required";
  }

  if (
    !validator.isEmail(
      email.trim()
    )
  ) {
    return "Invalid email";
  }

  return null;
};