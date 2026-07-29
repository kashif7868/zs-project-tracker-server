import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../../models/user/user.model.js";

import {
    generateAccessToken,
    generateRefreshToken,
} from "../../utils/generateToken.js";

import sendEmail from "../../services/email.service.js";
import passwordResetTemplate from "../../templates/email/passwordReset.template.js";
import emailVerificationTemplate from "../../templates/email/emailVerification.template.js";


const getSafeUserData = (user) => {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode,
        role: user.role,
        avatar: user.avatar,
        provider: user.provider,
        isVerified: user.isVerified,
        isPhoneVerified: user.isPhoneVerified,
        is2FAEnabled: user.is2FAEnabled,
        status: user.status,
    };
};


const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};


const sendVerificationEmailToUser = async (user) => {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedVerificationToken = hashToken(verificationToken);

    const expiresInMinutes = Number(
        process.env.EMAIL_VERIFICATION_EXPIRES_IN_MINUTES || 30
    );

    user.emailVerificationToken = hashedVerificationToken;
    user.emailVerificationExpires = Date.now() + expiresInMinutes * 60 * 1000;

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    const emailTemplate = emailVerificationTemplate({
        name: user.name,
        verificationUrl,
        verificationToken,
        expiresInMinutes,
    });

    await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
    });

    return {
        verificationToken,
        verificationUrl,
    };
};


export const registerService = async (userData) => {
    const { name, email, password, phone, countryCode } = userData;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        const error = new Error("Email already exists");
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || "",
        countryCode: countryCode || "",
        provider: "local",
        isVerified: false,
    });

    let emailVerification = {
        sent: false,
    };

    try {
        const verificationData = await sendVerificationEmailToUser(user);

        emailVerification.sent = true;

        if (process.env.NODE_ENV === "development") {
            emailVerification.verificationToken = verificationData.verificationToken;
            emailVerification.verificationUrl = verificationData.verificationUrl;
        }
    } catch (error) {
        emailVerification.sent = false;

        if (process.env.NODE_ENV === "development") {
            emailVerification.error = error.message;
        }
    }

    return {
        success: true,
        message: emailVerification.sent
            ? "User registered successfully. Please verify your email before login."
            : "User registered successfully, but verification email could not be sent.",
        emailVerification,
        user: getSafeUserData(user),
    };
};


export const loginService = async ({ email, password }) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    if (user.status === "blocked") {
        const error = new Error("Your account has been blocked");
        error.statusCode = 403;
        throw error;
    }

    if (user.status === "inactive") {
        const error = new Error("Your account is inactive");
        error.statusCode = 403;
        throw error;
    }

    if (user.provider !== "local") {
        const error = new Error(`Please login with ${user.provider}`);
        error.statusCode = 400;
        throw error;
    }

    if (!user.isVerified) {
        const error = new Error("Please verify your email before login");
        error.statusCode = 403;
        throw error;
    }

    const isPasswordMatched = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordMatched) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    return {
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        user: getSafeUserData(user),
    };
};


export const profileService = async (user) => {
    return {
        success: true,
        message: "Profile fetched successfully",
        user: getSafeUserData(user),
    };
};


export const logoutService = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    user.refreshToken = "";
    await user.save();

    return {
        success: true,
        message: "Logout successful",
    };
};


export const refreshTokenService = async (refreshToken) => {
    let decoded;

    try {
        decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );
    } catch (error) {
        const customError = new Error("Invalid or expired refresh token");
        customError.statusCode = 401;
        throw customError;
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 401;
        throw error;
    }

    if (user.status !== "active") {
        const error = new Error("User account is not active");
        error.statusCode = 403;
        throw error;
    }

    if (!user.isVerified) {
        const error = new Error("Please verify your email before refreshing token");
        error.statusCode = 403;
        throw error;
    }

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
        const error = new Error("Refresh token is invalid or already used");
        error.statusCode = 401;
        throw error;
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return {
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: getSafeUserData(user),
    };
};


export const changePasswordService = async (
    userId,
    oldPassword,
    newPassword
) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (user.provider !== "local") {
        const error = new Error("Password change is only available for local accounts");
        error.statusCode = 400;
        throw error;
    }

    const isPasswordMatched = await bcrypt.compare(
        oldPassword,
        user.password
    );

    if (!isPasswordMatched) {
        const error = new Error("Old password is incorrect");
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.refreshToken = "";

    await user.save();

    return {
        success: true,
        message: "Password changed successfully. Please login again.",
    };
};


export const forgotPasswordService = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        return {
            success: true,
            message: "If an account exists with this email, a password reset link has been sent.",
        };
    }

    if (user.provider !== "local") {
        const error = new Error(`Password reset is only available for local accounts. Please login with ${user.provider}.`);
        error.statusCode = 400;
        throw error;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = hashToken(resetToken);

    const expiresInMinutes = Number(
        process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES || 10
    );

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = Date.now() + expiresInMinutes * 60 * 1000;

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const emailTemplate = passwordResetTemplate({
        name: user.name,
        resetUrl,
        resetToken,
        expiresInMinutes,
    });

    try {
        await sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html,
        });
    } catch (error) {
        user.passwordResetToken = "";
        user.passwordResetExpires = null;

        await user.save();

        const emailError = new Error("Password reset email could not be sent");
        emailError.statusCode = 500;
        throw emailError;
    }

    const response = {
        success: true,
        message: "Password reset email sent successfully",
    };

    if (process.env.NODE_ENV === "development") {
        response.resetToken = resetToken;
        response.resetUrl = resetUrl;
    }

    return response;
};


export const resetPasswordService = async (token, newPassword) => {
    if (!token) {
        const error = new Error("Reset token is required");
        error.statusCode = 400;
        throw error;
    }

    const hashedResetToken = hashToken(token);

    const user = await User.findOne({
        passwordResetToken: hashedResetToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        const error = new Error("Invalid or expired reset token");
        error.statusCode = 400;
        throw error;
    }

    if (user.provider !== "local") {
        const error = new Error("Password reset is only available for local accounts");
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.passwordResetToken = "";
    user.passwordResetExpires = null;
    user.refreshToken = "";

    await user.save();

    return {
        success: true,
        message: "Password reset successfully. Please login with your new password.",
    };
};


export const verifyEmailService = async (token) => {
    if (!token) {
        const error = new Error("Verification token is required");
        error.statusCode = 400;
        throw error;
    }

    const hashedVerificationToken = hashToken(token);

    const user = await User.findOne({
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
        const error = new Error("Invalid or expired verification token");
        error.statusCode = 400;
        throw error;
    }

    user.isVerified = true;
    user.emailVerificationToken = "";
    user.emailVerificationExpires = null;

    await user.save();

    return {
        success: true,
        message: "Email verified successfully",
        user: getSafeUserData(user),
    };
};


export const resendVerificationEmailService = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        return {
            success: true,
            message: "If an account exists with this email, a verification email has been sent.",
        };
    }

    if (user.provider !== "local") {
        const error = new Error(`Email verification is only available for local accounts. Please login with ${user.provider}.`);
        error.statusCode = 400;
        throw error;
    }

    if (user.isVerified) {
        return {
            success: true,
            message: "Email is already verified",
        };
    }

    let verificationData;

    try {
        verificationData = await sendVerificationEmailToUser(user);
    } catch (error) {
        const emailError = new Error("Verification email could not be sent");
        emailError.statusCode = 500;
        throw emailError;
    }

    const response = {
        success: true,
        message: "Verification email sent successfully",
    };

    if (process.env.NODE_ENV === "development") {
        response.verificationToken = verificationData.verificationToken;
        response.verificationUrl = verificationData.verificationUrl;
    }

    return response;
};