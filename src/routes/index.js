import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
const router = express.Router();


// Auth Routes
router.use("/auth", authRoutes);
// User Routes
router.use("/users", userRoutes);

export default router;