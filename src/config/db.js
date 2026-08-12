import mongoose from "mongoose";
import chalk from "chalk";

import Risk from "../models/task_register/task.model.js";

/* =========================================================
   DATABASE CONNECTION
   ========================================================= */

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI?.trim();

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is missing from environment variables."
      );
    }

    await mongoose.connect(
      mongoUri
    );

    console.log(
      chalk.green.bold(
        "✅ MongoDB connected successfully"
      )
    );

    /* =====================================================
       ONE-TIME RISK INDEX SYNCHRONIZATION

       Enable temporarily in .env:

       SYNC_RISK_INDEXES=true

       After successful synchronization, change it back to:

       SYNC_RISK_INDEXES=false
       ===================================================== */

    const shouldSyncRiskIndexes =
      process.env
        .SYNC_RISK_INDEXES ===
      "true";

    if (
      shouldSyncRiskIndexes
    ) {
      console.log(
        chalk.yellow.bold(
          "⚠️ Checking Risk collection indexes..."
        )
      );

      const indexDifference =
        await Risk.diffIndexes();

      console.log(
        chalk.cyan.bold(
          "Risk indexes to remove:"
        ),
        indexDifference.toDrop
      );

      console.log(
        chalk.cyan.bold(
          "Risk indexes to create:"
        ),
        indexDifference.toCreate
      );

      const droppedIndexes =
        await Risk.syncIndexes();

      console.log(
        chalk.green.bold(
          "✅ Risk indexes synchronized successfully"
        )
      );

      console.log(
        chalk.yellow(
          "Removed stale indexes:"
        ),
        droppedIndexes
      );
    }
  } catch (error) {
    console.log(
      chalk.red.bold(
        `❌ MongoDB Connection Error: ${
          error instanceof Error
            ? error.message
            : "Unknown database error"
        }`
      )
    );

    process.exit(1);
  }
};

export default connectDB;