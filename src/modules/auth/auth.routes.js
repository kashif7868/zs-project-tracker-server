import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  registerLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  resendVerificationEmailLimiter,
} from "../../middlewares/rateLimit.middleware.js";

import {
  registerController,
  loginController,
  profileController,
  logoutController,
  refreshTokenController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
  verifyEmailController,
  resendVerificationEmailController,
} from "./auth.controller.js";

const router = express.Router();

/* =========================================================
   PUBLIC AUTH ROUTES
   ========================================================= */

// Register User
router.post(
  "/register",
  registerLimiter,
  registerController
);

// Login User
router.post(
  "/login",
  loginLimiter,
  loginController
);

// Refresh Token
router.post(
  "/refresh-token",
  refreshTokenController
);

// Forgot Password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordController
);

// Reset Password
router.patch(
  "/reset-password/:token",
  resetPasswordLimiter,
  resetPasswordController
);

/* =========================================================
   EMAIL VERIFICATION ROUTES

   These routes are kept for backward compatibility.

   Email verification will no longer be required for login
   or protected Project Tracker access.
   ========================================================= */

router.get(
  "/verify-email/:token",
  verifyEmailController
);

router.post(
  "/resend-verification-email",
  resendVerificationEmailLimiter,
  resendVerificationEmailController
);

/* =========================================================
   PROTECTED AUTH ROUTES
   ========================================================= */

// Profile
router.get(
  "/profile",
  authMiddleware,
  profileController
);

// Logout
router.post(
  "/logout",
  authMiddleware,
  logoutController
);

// Change Password
router.patch(
  "/change-password",
  authMiddleware,
  changePasswordController
);

export default router;