import validator from "validator";


// Register Validation
export const validateRegisterInput = (data) => {
    if (!data) {
        return "Request body is missing";
    }

    const { name, email, password, phone, countryCode } = data;

    if (!name || !email || !password) {
        return "Name, email and password are required";
    }

    if (name.trim().length < 2) {
        return "Name must be at least 2 characters";
    }

    if (!validator.isEmail(email)) {
        return "Invalid email";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters";
    }

    if (phone && !validator.isMobilePhone(phone, "any")) {
        return "Invalid phone number";
    }

    if (countryCode && !/^\+\d{1,4}$/.test(countryCode)) {
        return "Invalid country code";
    }

    return null;
};


// Login Validation
export const validateLoginInput = (data) => {
    if (!data) {
        return "Request body is missing";
    }

    const { email, password } = data;

    if (!email || !password) {
        return "Email and password are required";
    }

    if (!validator.isEmail(email)) {
        return "Invalid email";
    }

    return null;
};


// Refresh Token Validation
export const validateRefreshTokenInput = (data) => {
    if (!data) {
        return "Request body is missing";
    }

    const { refreshToken } = data;

    if (!refreshToken) {
        return "Refresh token is required";
    }

    return null;
};


// Change Password Validation
export const validateChangePasswordInput = (data) => {
    if (!data) {
        return "Request body is missing";
    }

    const { oldPassword, newPassword, confirmPassword } = data;

    if (!oldPassword || !newPassword) {
        return "Old password and new password are required";
    }

    if (newPassword.length < 8) {
        return "New password must be at least 8 characters";
    }

    if (oldPassword === newPassword) {
        return "New password must be different from old password";
    }

    if (confirmPassword && newPassword !== confirmPassword) {
        return "New password and confirm password do not match";
    }

    return null;
};


// Forgot Password Validation
export const validateForgotPasswordInput = (data) => {
    if (!data) {
        return "Request body is missing";
    }

    const { email } = data;

    if (!email) {
        return "Email is required";
    }

    if (!validator.isEmail(email)) {
        return "Invalid email";
    }

    return null;
};


// Reset Password Validation
export const validateResetPasswordInput = (data) => {
    if (!data) {
        return "Request body is missing";
    }

    const { newPassword, confirmPassword } = data;

    if (!newPassword) {
        return "New password is required";
    }

    if (newPassword.length < 8) {
        return "New password must be at least 8 characters";
    }

    if (confirmPassword && newPassword !== confirmPassword) {
        return "New password and confirm password do not match";
    }

    return null;
};


// Resend Verification Email Validation
export const validateResendVerificationEmailInput = (data) => {
    if (!data) {
        return "Request body is missing";
    }

    const { email } = data;

    if (!email) {
        return "Email is required";
    }

    if (!validator.isEmail(email)) {
        return "Invalid email";
    }

    return null;
};