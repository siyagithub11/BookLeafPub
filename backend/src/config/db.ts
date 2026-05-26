import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

async function connectWithRetry(retriesLeft: number): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    logger.info("MongoDB connected", {
      host: mongoose.connection.host,
      db: mongoose.connection.name,
    });
  } catch (err) {
    if (retriesLeft === 0) {
      logger.error("MongoDB connection failed after maximum retries", { err });
      process.exit(1);
    }

    logger.warn(`MongoDB connection failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`, {
      retriesLeft,
      err: (err as Error).message,
    });

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectWithRetry(retriesLeft - 1);
  }
}

export async function connectDB(): Promise<void> {
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error", { err });
  });

  await connectWithRetry(MAX_RETRIES);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  logger.info("MongoDB disconnected cleanly");
}