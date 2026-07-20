import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";

const app = express();

// Security Middleware
app.use(helmet());

// Enable CORS
app.use(cors());

// Logging Middleware
app.use(morgan("dev"));

// Parse JSON
app.use(express.json());

// Parse Form Data
app.use(express.urlencoded({ extended: true }));

// Parse Cookies
app.use(cookieParser());

// Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend Server Running Successfully",
  });
});

// API Routes
app.use("/api/v1", routes);

export default app;