import rateLimit from "express-rate-limit";

/* =========================================================
   LOGIN RATE LIMITER

   3 failed login attempts allowed.
   After that, login is blocked for 15 seconds.

   Successful login requests are not counted.
   ========================================================= */

export const loginLimiter = rateLimit({
  windowMs: 15 * 1000,

  max: 3,

  skipSuccessfulRequests: true,

  message: {
    success: false,

    message:
      "Too many login attempts. Please try again after 15 seconds.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

/* =========================================================
   FORGOT PASSWORD RATE LIMITER
   ========================================================= */

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 3,

  message: {
    success: false,

    message:
      "Too many password reset requests. Please try again after 15 minutes.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

/* =========================================================
   RESET PASSWORD RATE LIMITER
   ========================================================= */

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 5,

  message: {
    success: false,

    message:
      "Too many reset password attempts. Please try again after 15 minutes.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

/* =========================================================
   RESEND VERIFICATION EMAIL RATE LIMITER

   Kept for backward compatibility.
   Email verification is not required for normal Tracker
   authentication.
   ========================================================= */

export const resendVerificationEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 3,

  message: {
    success: false,

    message:
      "Too many verification email requests. Please try again after 15 minutes.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});

/* =========================================================
   REGISTER RATE LIMITER
   ========================================================= */

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 5,

  message: {
    success: false,

    message:
      "Too many registration attempts. Please try again after 15 minutes.",
  },

  standardHeaders: true,

  legacyHeaders: false,
});