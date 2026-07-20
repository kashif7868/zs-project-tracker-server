import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  getAllUsersController,
  getUserByIdController,
  updateUserController,
  deleteUserController,
} from "./user.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getAllUsersController);

router.get("/:id", authMiddleware, getUserByIdController);

router.patch("/:id", authMiddleware, updateUserController);

router.delete("/:id", authMiddleware, deleteUserController);

export default router;