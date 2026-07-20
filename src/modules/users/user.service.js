import User from "../../models/user/user.model.js";

export const getAllUsersService = async () => {
  const users = await User.find()
    .select("-password -refreshToken -twoFASecret -__v")
    .sort({ createdAt: -1 });

  return {
    success: true,
    message: "Users fetched successfully",
    count: users.length,
    users,
  };
};

export const getUserByIdService = async (userId) => {
  const user = await User.findById(userId).select(
    "-password -refreshToken -twoFASecret -__v"
  );

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
  if (updateData.email) {
    const existingUser = await User.findOne({
      email: updateData.email,
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
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).select("-password -refreshToken -twoFASecret -__v");

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