
import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/authenticate";
import { validate, validateObjectId } from "../middleware/errorHandler";
import { authRateLimiter, aiRateLimiter } from "../middleware/rateLimiter";
import { loginSchema } from "../validators/ticket.validator";
import {
  createTicketSchema,
  updateTicketSchema,
  addMessageSchema,
  addNoteSchema,
} from "../validators/ticket.validator";
import * as authCtrl from "../controllers/auth.controller";
import * as bookCtrl from "../controllers/book.controller";
import * as ticketCtrl from "../controllers/ticket.controller";

const router = Router();

// ─── Health ───────────────────────────────────────────────────────────────────
router.get("/health", (_req: Request, res: Response) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", authRateLimiter, validate(loginSchema), authCtrl.login);
router.post("/auth/logout", authenticate, authCtrl.logout);
router.get("/auth/me", authenticate, authCtrl.getMe);

// ─── Author: Books ────────────────────────────────────────────────────────────

router.get(
  "/books",
  authenticate,
  authorize(["author"]),
  bookCtrl.getMyBooks
);

router.get(
  "/books/stats",
  authenticate,
  authorize(["author"]),
  bookCtrl.getAuthorDashboardStats
);

router.get(
  "/books/:id",
  authenticate,
  authorize(["author"]),
  validateObjectId,
  bookCtrl.getMyBookById
);

// ─── Author: Tickets ──────────────────────────────────────────────────────────

router.post(
  "/tickets",
  authenticate,
  authorize(["author"]),
  validate(createTicketSchema),
  ticketCtrl.createTicket
);

router.get(
  "/tickets",
  authenticate,
  authorize(["author"]),
  ticketCtrl.getMyTickets
);

router.get(
  "/tickets/:id",
  authenticate,
  authorize(["author"]),
  validateObjectId,
  ticketCtrl.getMyTicketById
);

router.post(
  "/tickets/:id/messages",
  authenticate,
  authorize(["author"]),
  validateObjectId,
  validate(addMessageSchema),
  ticketCtrl.addAuthorMessage
);

// ─── Admin: Dashboard & Stats ─────────────────────────────────────────────────

router.get(
  "/admin/stats",
  authenticate,
  authorize(["admin"]),
  ticketCtrl.getAdminStats
);

// ─── Admin: Ticket Queue ──────────────────────────────────────────────────────

router.get(
  "/admin/tickets",
  authenticate,
  authorize(["admin"]),
  ticketCtrl.getAdminTickets
);

router.get(
  "/admin/tickets/:id",
  authenticate,
  authorize(["admin"]),
  validateObjectId,
  ticketCtrl.getAdminTicketById
);

router.patch(
  "/admin/tickets/:id",
  authenticate,
  authorize(["admin"]),
  validateObjectId,
  validate(updateTicketSchema),
  ticketCtrl.updateTicket
);

router.post(
  "/admin/tickets/:id/messages",
  authenticate,
  authorize(["admin"]),
  validateObjectId,
  validate(addMessageSchema),
  ticketCtrl.addAdminMessage
);

router.post(
  "/admin/tickets/:id/notes",
  authenticate,
  authorize(["admin"]),
  validateObjectId,
  validate(addNoteSchema),
  ticketCtrl.addInternalNote
);

router.get(
  "/admin/tickets/:id/notes",
  authenticate,
  authorize(["admin"]),
  validateObjectId,
  ticketCtrl.getInternalNotes
);

router.post(
  "/admin/tickets/:id/ai/regenerate",
  authenticate,
  authorize(["admin"]),
  validateObjectId,
  aiRateLimiter,
  ticketCtrl.regenerateAIDraft
);

export default router;