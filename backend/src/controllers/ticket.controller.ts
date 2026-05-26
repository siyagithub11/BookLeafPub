
import { Request, Response } from "express";
import { ticketService } from "../services/ticket.service";
import { internalNoteRepository } from "../repositories/message.repository";
import { asyncHandler, successResponse, createdResponse, parsePagination, param } from "../utils/helpers";
import { TicketCategory, TicketPriority, TicketStatus } from "../models/Ticket.model";

// ─── Author ───────────────────────────────────────────────────────────────────

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const { bookId, subject, description } = req.body as { bookId?: string; subject: string; description: string };
  const ticket = await ticketService.createTicket({ authorId: req.user!.id, bookId: bookId || undefined, subject, description });
  return createdResponse(res, { ticket });
});

export const getMyTickets = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const { tickets, meta } = await ticketService.getAuthorTickets(
    req.user!.id, pagination,
    { status: req.query.status ? param(req.query.status as string | string[]) : undefined }
  );
  return successResponse(res, { tickets }, 200, meta);
});

export const getMyTicketById = asyncHandler(async (req: Request, res: Response) => {
  const { ticket, messages } = await ticketService.getTicketForAuthor(param(req.params.id), req.user!.id);
  return successResponse(res, { ticket, messages });
});

export const addAuthorMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body as { message: string };
  const saved = await ticketService.addAuthorMessage(param(req.params.id), req.user!.id, message);
  return createdResponse(res, { message: saved });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAdminTickets = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const q = req.query as Record<string, string>;
  const { tickets, meta } = await ticketService.getAdminTicketQueue(pagination, {
    status: q.status, category: q.category, priority: q.priority,
    assignedTo: q.assignedTo === "me" ? req.user!.id : q.assignedTo,
    search: q.search, sortBy: q.sortBy,
    sortOrder: q.sortOrder as "asc" | "desc" | undefined,
  });
  return successResponse(res, { tickets }, 200, meta);
});

export const getAdminTicketById = asyncHandler(async (req: Request, res: Response) => {
  const { ticket, messages } = await ticketService.getTicketForAdmin(param(req.params.id));
  return successResponse(res, { ticket, messages });
});

export const updateTicket = asyncHandler(async (req: Request, res: Response) => {
  const { status, category, priority, assignedTo } = req.body as {
    status?: TicketStatus; category?: TicketCategory; priority?: TicketPriority; assignedTo?: string | null;
  };
  const ticket = await ticketService.updateTicket(param(req.params.id), { status, category, priority, assignedTo });
  return successResponse(res, { ticket });
});

export const addAdminMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message, isFromAIDraft = false } = req.body as { message: string; isFromAIDraft?: boolean };
  const saved = await ticketService.addAdminMessage(param(req.params.id), req.user!.id, message, isFromAIDraft);
  return createdResponse(res, { message: saved });
});

export const addInternalNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await internalNoteRepository.create({
    ticketId: param(req.params.id), adminId: req.user!.id,
    note: (req.body as { note: string }).note,
  });
  return createdResponse(res, { note });
});

export const getInternalNotes = asyncHandler(async (req: Request, res: Response) => {
  const notes = await internalNoteRepository.findByTicket(param(req.params.id));
  return successResponse(res, { notes });
});

export const regenerateAIDraft = asyncHandler(async (req: Request, res: Response) => {
  const draft = await ticketService.regenerateAIDraft(param(req.params.id));
  return successResponse(res, { aiDraftResponse: draft });
});

export const getAdminStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await ticketService.getAdminStats();
  return successResponse(res, { stats });
});