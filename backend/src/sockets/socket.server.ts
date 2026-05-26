import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "../config/logger";

let io: SocketServer | null = null;

interface SocketUser {
  id: string;
  role: "author" | "admin";
  name: string;
}

declare module "socket.io" {
  interface Socket {
    user?: SocketUser;
  }
}

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 min recovery window
    },
  });

  // ─── Authentication middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as SocketUser & {
        id: string;
      };
      socket.user = { id: decoded.id, role: decoded.role, name: decoded.name };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  // ─── Connection handling ───────────────────────────────────────────────────
  io.on("connection", (socket: Socket) => {
    const user = socket.user!;

    logger.debug("Socket connected", {
      socketId: socket.id,
      userId: user.id,
      role: user.role,
    });

    // Admins automatically join the admin queue room
    if (user.role === "admin") {
      socket.join("admin:queue");
      logger.debug("Admin joined queue room", { userId: user.id });
    }

    // Authors join their personal room for targeted notifications
    if (user.role === "author") {
      socket.join(`author:${user.id}`);
    }

    // ─── Room: join a specific ticket ──────────────────────────────────────
    socket.on("join:ticket", (ticketId: string) => {
      if (!ticketId || typeof ticketId !== "string") return;
      socket.join(`ticket:${ticketId}`);
      logger.debug("User joined ticket room", {
        userId: user.id,
        ticketId,
      });
    });

    socket.on("leave:ticket", (ticketId: string) => {
      if (!ticketId || typeof ticketId !== "string") return;
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on("disconnect", (reason) => {
      logger.debug("Socket disconnected", {
        socketId: socket.id,
        userId: user.id,
        reason,
      });
    });

    socket.on("error", (err) => {
      logger.error("Socket error", { socketId: socket.id, err });
    });
  });

  logger.info("Socket.IO server initialized");
  return io;
}

export function getSocketServer(): SocketServer | null {
  return io;
}