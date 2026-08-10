import dotenv from "dotenv";
dotenv.config();

import chalk from "chalk";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Database Connection
    await connectDB();

    // Start Server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        chalk.blue.bold(
          `🚀 Server running successfully on port ${PORT}`
        )
      );
    });
  } catch (error) {
    console.error(
      chalk.red.bold(
        `❌ Failed to start server: ${error.message}`
      )
    );

    process.exit(1);
  }
};

startServer();