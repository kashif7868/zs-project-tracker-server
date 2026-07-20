import mongoose from "mongoose";
import chalk from "chalk";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log(
      chalk.green.bold("✅ MongoDB connected successfully")
    );

  } catch (error) {
    console.log(
      chalk.red.bold(
        `❌ MongoDB Connection Error: ${error.message}`
      )
    );

    process.exit(1);
  }
};

export default connectDB;