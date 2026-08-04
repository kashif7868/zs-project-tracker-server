import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import projectRoutes from "../modules/projects/project.routes.js";
import riskRoutes from "../modules/risks/risk.routes.js";
import evidenceRoutes from "../modules/evidences/evidence.routes.js";

const router = express.Router();

/* =========================================================
   AUTH ROUTES
   /api/v1/auth
   ========================================================= */

router.use("/auth", authRoutes);

/* =========================================================
   USER ROUTES
   /api/v1/users
   ========================================================= */

router.use("/users", userRoutes);

/* =========================================================
   PROJECT ROUTES
   /api/v1/projects
   ========================================================= */

router.use("/projects", projectRoutes);

/* =========================================================
   RISK REGISTER ROUTES
   /api/v1/risks
   ========================================================= */

router.use("/risks", riskRoutes);

/* =========================================================
   RISK EVIDENCE ROUTES
   /api/v1/evidences

   Before Evidence:
   POST /api/v1/evidences/risk/:riskId/before

   After Evidence:
   POST /api/v1/evidences/risk/:riskId/after
   ========================================================= */

router.use("/evidences", evidenceRoutes);

export default router;