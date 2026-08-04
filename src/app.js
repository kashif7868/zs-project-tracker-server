import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";

import {
  notFoundMiddleware,
  globalErrorMiddleware,
} from "./middlewares/error.middleware.js";

/* =========================================================
   APP
   ========================================================= */

const app = express();

/* =========================================================
   DIRECTORY PATHS

   Current file:
   backend/src/app.js

   Public folder:
   backend/public
   ========================================================= */

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  path.dirname(currentFilePath);

const publicDirectory = path.resolve(
  currentDirectory,
  "../public"
);

const uploadsDirectory = path.join(
  publicDirectory,
  "uploads"
);

/* =========================================================
   SECURITY MIDDLEWARE

   crossOriginResourcePolicy cross-origin rakha hai taa-ke
   frontend localhost:5173 backend localhost:5000 se
   Before/After images display kar sake.
   ========================================================= */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/* =========================================================
   CORS
   ========================================================= */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* =========================================================
   LOGGING
   ========================================================= */

app.use(morgan("dev"));

/* =========================================================
   BODY PARSERS
   ========================================================= */

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(cookieParser());

/* =========================================================
   STATIC UPLOADS

   Physical folders:

   public/uploads/risks/before/
   public/uploads/risks/after/

   Public URLs:

   http://localhost:5000/uploads/risks/before/image.jpg
   http://localhost:5000/uploads/risks/after/image.jpg
   ========================================================= */

app.use(
  "/uploads",
  express.static(uploadsDirectory, {
    fallthrough: true,
    index: false,
    maxAge: "7d",
    immutable: false,

    setHeaders(res) {
      res.setHeader(
        "Cross-Origin-Resource-Policy",
        "cross-origin"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=604800"
      );
    },
  })
);

/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get("/", (_req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Backend Server Running Successfully",
  });
});

/* =========================================================
   API ROUTES

   /api/v1/auth
   /api/v1/users
   /api/v1/projects
   /api/v1/risks
   /api/v1/evidences
   ========================================================= */

app.use("/api/v1", routes);

/* =========================================================
   404 MIDDLEWARE
   ========================================================= */

app.use(notFoundMiddleware);

/* =========================================================
   GLOBAL ERROR MIDDLEWARE
   ========================================================= */

app.use(globalErrorMiddleware);

/* =========================================================
   EXPORT
   ========================================================= */

export default app;