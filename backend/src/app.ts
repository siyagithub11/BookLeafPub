import dotenv from "dotenv";
dotenv.config();
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { createServer } from "http";

import { env } from "./config/env";
import { connectDB } from "./config/db";
import { logger } from "./config/logger";
import { globalRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { initSocketServer } from "./sockets/socket.server";
import routes from "./routes/index";

async function bootstrap() {
  const app = express();

  // ─── Security ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ─── Parsing & Logging ─────────────────────────────────────────────────────
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (env.NODE_ENV !== "test") {
    app.use(
      morgan("combined", {
        stream: { write: (msg) => logger.http(msg.trim()) },
        skip: (req) => req.path === "/api/v1/health",
      })
    );
  }

  // ─── Rate Limiting ─────────────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.use("/api/v1", routes);

  // ─── Error Handling ────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ─── HTTP + Socket.IO server ───────────────────────────────────────────────
  const httpServer = createServer(app);
  initSocketServer(httpServer);

  // ─── Database ──────────────────────────────────────────────────────────────
  await connectDB();

  httpServer.listen(env.PORT, () => {
    logger.info(`BookLeaf server running`, {
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });

  // ─── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      const { disconnectDB } = await import("./config/db");
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});