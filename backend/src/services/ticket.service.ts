
import { ticketRepository, TicketFilters } from "../repositories/ticket.repository";
import { bookRepository } from "../repositories/book.repository";
import { messageRepository } from "../repositories/message.repository";
import { ITicket, TicketCategory, TicketPriority, TicketStatus } from "../models/Ticket.model";
import { classifyTicket } from "../ai/classifier";
import { scoreTicketPriority } from "../ai/prioritizer";
import { generateDraftResponse } from "../ai/draftGenerator";
import { NotFoundError, BadRequestError } from "../errors/AppError";
import { generateTicketNumber, PaginationParams } from "../utils/helpers";
import { logger } from "../config/logger";
import { userRepository } from "../repositories/user.repository";
import { getSocketServer } from "../sockets/socket.server";

interface CreateTicketInput {
  authorId: string;
  bookId?: string;
  subject: string;
  description: string;
}

interface UpdateTicketInput {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assignedTo?: string | null;
  categoryOverridden?: boolean;
  priorityOverridden?: boolean;
}

export class TicketService {
  async createTicket(input: CreateTicketInput): Promise<ITicket> {
    if (input.bookId) {
      const book = await bookRepository.findByIdForAuthor(input.bookId, input.authorId);
      if (!book) throw new BadRequestError("Book not found or does not belong to you");
    }

    const ticketNumber = generateTicketNumber();

    const ticket = await ticketRepository.create({
      ticketNumber,
      authorId: input.authorId as unknown as ITicket["authorId"],
      bookId: input.bookId ? (input.bookId as unknown as ITicket["bookId"]) : undefined,
      subject: input.subject,
      description: input.description,
      status: "Open",
      category: "General Inquiry",
      priority: "Medium",
    });

    logger.info("Ticket created", { ticketNumber, authorId: input.authorId });

    // Fire-and-forget AI pipeline
    this.runAIPipeline(ticket._id.toString(), input, ticketNumber).catch((err) => {
      logger.error("AI pipeline crashed", { ticketId: ticket._id, err });
    });

    return ticket;
  }

  private async runAIPipeline(ticketId: string, input: CreateTicketInput, ticketNumber: string): Promise<void> {
    try {
      const category = await classifyTicket(input.subject, input.description);
      const priority = await scoreTicketPriority(input.subject, input.description, category);

      const [author, book] = await Promise.all([
        userRepository.findById(input.authorId),
        input.bookId ? bookRepository.findById(input.bookId) : Promise.resolve(null),
      ]);

      const draftResponse = await generateDraftResponse({
        ticketNumber,
        subject: input.subject,
        description: input.description,
        category,
        author: { name: author?.name ?? "Author", joinedDate: author?.joinedDate },
        book: book
          ? {
              title: book.title,
              isbn: book.isbn,
              status: book.status,
              mrp: book.mrp,
              totalCopiesSold: book.totalCopiesSold,
              royaltyPending: book.royaltyPending,
              totalRoyaltyEarned: book.totalRoyaltyEarned,
              lastRoyaltyPayoutDate: book.lastRoyaltyPayoutDate,
              availableOn: book.availableOn,
            }
          : null,
      });

      const updatedTicket = await ticketRepository.updateById(ticketId, {
        category,
        priority,
        aiClassification: category,
        aiPriority: priority,
        aiDraftResponse: draftResponse,
        aiProcessedAt: new Date(),
        aiError: false,
      });

      logger.info("AI pipeline complete", { ticketId, category, priority, hasDraft: !!draftResponse });

      const io = getSocketServer();
      if (io) {
        io.to("admin:queue").emit("ticket:created", {
          ticket: updatedTicket,
          author: { name: author?.name, email: author?.email },
        });
        io.to(`ticket:${ticketId}`).emit("ticket:ai_ready", {
          ticketId,
          aiClassification: category,
          aiPriority: priority,
          aiDraftResponse: draftResponse,
        });
      }
    } catch (err) {
      logger.error("AI pipeline error — ticket still functional", { ticketId, err });
      await ticketRepository.updateById(ticketId, {
        aiError: true,
        aiErrorMessage: (err as Error).message,
      });

      const io = getSocketServer();
      if (io) {
        const ticket = await ticketRepository.findById(ticketId);
        if (ticket) io.to("admin:queue").emit("ticket:created", { ticket });
      }
    }
  }

  async getAuthorTickets(authorId: string, pagination: PaginationParams, filters: Pick<TicketFilters, "status">) {
    return ticketRepository.findByAuthor(authorId, pagination, filters);
  }

  async getTicketForAuthor(ticketId: string, authorId: string) {
    const ticket = await ticketRepository.findByIdForAuthor(ticketId, authorId);
    if (!ticket) throw new NotFoundError("Ticket");
    const messages = await messageRepository.findByTicket(ticketId);
    return { ticket, messages };
  }

  async addAuthorMessage(ticketId: string, authorId: string, message: string) {
    const ticket = await ticketRepository.findByIdForAuthor(ticketId, authorId);
    if (!ticket) throw new NotFoundError("Ticket");
    if (ticket.status === "Closed") throw new BadRequestError("Cannot reply to a closed ticket");

    const savedMessage = await messageRepository.create({ ticketId, senderId: authorId, senderRole: "author", message });

    if (ticket.status === "Resolved") {
      await ticketRepository.updateById(ticketId, { status: "Open" });
    }

    const io = getSocketServer();
    io?.to(`ticket:${ticketId}`).emit("message:received", { message: savedMessage, senderRole: "author" });
    return savedMessage;
  }

  async getAdminTicketQueue(pagination: PaginationParams, filters: TicketFilters) {
    return ticketRepository.findWithFilters(pagination, filters);
  }

  async getTicketForAdmin(ticketId: string) {
    const ticket = await ticketRepository.findByIdForAdmin(ticketId);
    if (!ticket) throw new NotFoundError("Ticket");
    const messages = await messageRepository.findByTicket(ticketId);
    return { ticket, messages };
  }

  async updateTicket(ticketId: string, updates: UpdateTicketInput): Promise<ITicket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError("Ticket");

    const safeUpdates: Record<string, unknown> = {};
    if (updates.status !== undefined) safeUpdates.status = updates.status;
    if (updates.category !== undefined) { safeUpdates.category = updates.category; safeUpdates.categoryOverridden = true; }
    if (updates.priority !== undefined) { safeUpdates.priority = updates.priority; safeUpdates.priorityOverridden = true; }
    if (updates.assignedTo !== undefined) safeUpdates.assignedTo = updates.assignedTo;

    const updatedTicket = await ticketRepository.updateById(ticketId, safeUpdates);
    if (!updatedTicket) throw new NotFoundError("Ticket");

    const io = getSocketServer();
    io?.to(`ticket:${ticketId}`).emit("ticket:updated", { ticketId, changes: updates });
    io?.to("admin:queue").emit("ticket:updated", { ticketId, changes: updates });

    return updatedTicket;
  }

  async addAdminMessage(ticketId: string, adminId: string, message: string, isFromAIDraft: boolean) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError("Ticket");

    const savedMessage = await messageRepository.create({
      ticketId, senderId: adminId, senderRole: "admin", message, isFromAIDraft,
    });

    if (ticket.status === "Open") {
      await ticketRepository.updateById(ticketId, { status: "In Progress" });
    }

    const io = getSocketServer();
    io?.to(`ticket:${ticketId}`).emit("message:received", { message: savedMessage, senderRole: "admin" });
    return savedMessage;
  }

  async regenerateAIDraft(ticketId: string): Promise<string | null> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError("Ticket");

    const [author, book] = await Promise.all([
      userRepository.findById(ticket.authorId.toString()),
      ticket.bookId ? bookRepository.findById(ticket.bookId.toString()) : null,
    ]);

    const draft = await generateDraftResponse({
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      author: { name: author?.name ?? "Author", joinedDate: author?.joinedDate },
      book: book ? {
        title: book.title, isbn: book.isbn, status: book.status, mrp: book.mrp,
        totalCopiesSold: book.totalCopiesSold, royaltyPending: book.royaltyPending,
        totalRoyaltyEarned: book.totalRoyaltyEarned, lastRoyaltyPayoutDate: book.lastRoyaltyPayoutDate,
      } : null,
    });

    await ticketRepository.updateById(ticketId, { aiDraftResponse: draft, aiProcessedAt: new Date() });
    return draft;
  }

  async getAdminStats() {
    return ticketRepository.getAdminDashboardStats();
  }
}

export const ticketService = new TicketService();