import {
  registerService,
  loginService,
  profileService,
  logoutService,
  refreshTokenService,
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
  verifyEmailService,
  resendVerificationEmailService,
} from "./auth.service.js";

import {
  validateRegisterInput,
  validateLoginInput,
  validateRefreshTokenInput,
  validateChangePasswordInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateResendVerificationEmailInput,
} from "./auth.validation.js";


// Register Controller
export const registerController = async (req, res) => {
  try {
    const validationError = validateRegisterInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const response = await registerService(req.body);

    return res.status(201).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Login Controller
export const loginController = async (req, res) => {
  try {
    const validationError = validateLoginInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const response = await loginService(req.body);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Profile Controller
export const profileController = async (req, res) => {
  try {
    const response = await profileService(req.user);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Logout Controller
export const logoutController = async (req, res) => {
  try {
    const response = await logoutService(req.user._id);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Refresh Token Controller
export const refreshTokenController = async (req, res) => {
  try {
    const validationError = validateRefreshTokenInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const response = await refreshTokenService(req.body.refreshToken);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Change Password Controller
export const changePasswordController = async (req, res) => {
  try {
    const validationError = validateChangePasswordInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const { oldPassword, newPassword } = req.body;

    const response = await changePasswordService(
      req.user._id,
      oldPassword,
      newPassword
    );

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Forgot Password Controller
export const forgotPasswordController = async (req, res) => {
  try {
    const validationError = validateForgotPasswordInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const response = await forgotPasswordService(req.body.email);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Reset Password Controller
export const resetPasswordController = async (req, res) => {
  try {
    const validationError = validateResetPasswordInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const { token } = req.params;
    const { newPassword } = req.body;

    const response = await resetPasswordService(token, newPassword);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Verify Email Controller
export const verifyEmailController = async (req, res) => {
  try {
    const { token } = req.params;

    const response = await verifyEmailService(token);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Resend Verification Email Controller
export const resendVerificationEmailController = async (req, res) => {
  try {
    const validationError = validateResendVerificationEmailInput(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const response = await resendVerificationEmailService(req.body.email);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};