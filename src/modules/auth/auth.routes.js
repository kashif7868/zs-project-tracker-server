import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";

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


// Register User
router.post("/register", registerController);

// Login User
router.post("/login", loginController);

// Refresh Token
router.post("/refresh-token", refreshTokenController);

// Forgot Password
router.post("/forgot-password", forgotPasswordController);

// Reset Password
router.patch("/reset-password/:token", resetPasswordController);

// Verify Email
router.get("/verify-email/:token", verifyEmailController);

// Resend Verification Email
router.post("/resend-verification-email", resendVerificationEmailController);

// Protected Profile Route
router.get(
    "/profile",
    authMiddleware,
    profileController
);

// Logout User
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