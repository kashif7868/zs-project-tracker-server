import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";

import {
  getAllUsersController,
  getUserByIdController,
  updateUserController,
  deleteUserController,
} from "./user.controller.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "super_admin"),
  getAllUsersController
);

router.get(
  "/:id",
  authMiddleware,
  getUserByIdController
);

router.patch(
  "/:id",
  authMiddleware,
  updateUserController
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "super_admin"),
  deleteUserController
);

export default router;