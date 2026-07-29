import User from "../../models/user/user.model.js";

const userSelectFields =
  "-password -refreshToken -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires -twoFASecret -__v";

const cleanUpdateData = (updateData) => {
  const cleanedData = { ...updateData };

  if (cleanedData.name) {
    cleanedData.name = cleanedData.name.trim();
  }

  if (cleanedData.email) {
    cleanedData.email = cleanedData.email.toLowerCase().trim();
  }

  if (cleanedData.phone) {
    cleanedData.phone = cleanedData.phone.trim();
  }

  if (cleanedData.countryCode) {
    cleanedData.countryCode = cleanedData.countryCode.trim();
  }

  if (cleanedData.avatar) {
    cleanedData.avatar = cleanedData.avatar.trim();
  }

  /*
    If admin blocks or deactivates user,
    existing refresh token should be removed.
  */
  if (
    cleanedData.status === "blocked" ||
    cleanedData.status === "inactive"
  ) {
    cleanedData.refreshToken = "";
  }

  return cleanedData;
};

export const getAllUsersService = async () => {
  const users = await User.find()
    .select(userSelectFields)
    .sort({ createdAt: -1 });

  return {
    success: true,
    message: "Users fetched successfully",
    count: users.length,
    users,
  };
};

export const getUserByIdService = async (userId) => {
  const user = await User.findById(userId).select(userSelectFields);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: "User fetched successfully",
    user,
  };
};

export const updateUserService = async (userId, updateData) => {
  const cleanedData = cleanUpdateData(updateData);

  if (cleanedData.email) {
    const existingUser = await User.findOne({
      email: cleanedData.email,
      _id: { $ne: userId },
    });

    if (existingUser) {
      const error = new Error("Email already exists");
      error.statusCode = 400;
      throw error;
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    cleanedData,
    {
      new: true,
      runValidators: true,
    }
  ).select(userSelectFields);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: "User updated successfully",
    user,
  };
};

export const deleteUserService = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: "User deleted successfully",
  };
};