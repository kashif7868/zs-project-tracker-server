import {
  getAllUsersService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
} from "./user.service.js";

import {
  validateMongoId,
  validateUpdateUserInput,
} from "./user.validation.js";

const isAdminUser = (user) => {
  return user.role === "admin" || user.role === "super_admin";
};


// Get All Users - Admin Only
export const getAllUsersController = async (req, res) => {
  try {
    const response = await getAllUsersService();

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get User By ID - Own Account or Admin
export const getUserByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    const validationError = validateMongoId(id);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const loggedInUserId = req.user._id.toString();
    const isOwnAccount = loggedInUserId === id;
    const isAdmin = isAdminUser(req.user);

    if (!isOwnAccount && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const response = await getUserByIdService(id);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Update User - Own Account or Admin
export const updateUserController = async (req, res) => {
  try {
    const { id } = req.params;

    const idValidationError = validateMongoId(id);

    if (idValidationError) {
      return res.status(400).json({
        success: false,
        message: idValidationError,
      });
    }

    const bodyValidationError = validateUpdateUserInput(req.body);

    if (bodyValidationError) {
      return res.status(400).json({
        success: false,
        message: bodyValidationError,
      });
    }

    const loggedInUserId = req.user._id.toString();
    const isOwnAccount = loggedInUserId === id;
    const isAdmin = isAdminUser(req.user);

    if (!isOwnAccount && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const updateData = { ...req.body };

    /*
      Normal user apni sensitive fields update nahi kar sakta.
      Admin/super_admin kar sakte hain.
    */
    if (!isAdmin) {
      delete updateData.email;
      delete updateData.role;
      delete updateData.isVerified;
      delete updateData.is2FAEnabled;
      delete updateData.status;
    }

    const response = await updateUserService(id, updateData);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


// Delete User - Admin Only
export const deleteUserController = async (req, res) => {
  try {
    const { id } = req.params;

    const validationError = validateMongoId(id);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const response = await deleteUserService(id);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};