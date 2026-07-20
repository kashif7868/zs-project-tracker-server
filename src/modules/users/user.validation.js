import mongoose from "mongoose";
import validator from "validator";

export const validateMongoId = (id) => {
  if (!id) {
    return "User ID is required";
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return "Invalid user ID";
  }

  return null;
};

export const validateUpdateUserInput = (data) => {
  if (!data || Object.keys(data).length === 0) {
    return "At least one field is required for update";
  }

  const allowedFields = [
    "name",
    "email",
    "avatar",
    "role",
    "isVerified",
    "is2FAEnabled",
  ];

  const incomingFields = Object.keys(data);

  const invalidField = incomingFields.find(
    (field) => !allowedFields.includes(field)
  );

  if (invalidField) {
    return `${invalidField} is not allowed`;
  }

  if (data.name && data.name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }

  if (data.email && !validator.isEmail(data.email)) {
    return "Invalid email";
  }

  if (
    data.role &&
    !["user", "admin", "super_admin"].includes(data.role)
  ) {
    return "Invalid role";
  }

  if (
    data.isVerified !== undefined &&
    typeof data.isVerified !== "boolean"
  ) {
    return "isVerified must be true or false";
  }

  if (
    data.is2FAEnabled !== undefined &&
    typeof data.is2FAEnabled !== "boolean"
  ) {
    return "is2FAEnabled must be true or false";
  }

  return null;
};