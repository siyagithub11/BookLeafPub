
import { Types } from "mongoose";
import { Ticket, ITicket } from "../models/Ticket.model";
import { PaginationParams, buildPaginationMeta } from "../utils/helpers";

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  authorId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedTickets {
  tickets: ITicket[];
  meta: ReturnType<typeof buildPaginationMeta>;
}

export class TicketRepository {
  async findByAuthor(
    authorId: string,
    pagination: PaginationParams,
    filters: Pick<TicketFilters, "status">
  ): Promise<PaginatedTickets> {
    const query: Record<string, unknown> = { authorId: new Types.ObjectId(authorId) };
    if (filters.status) query.status = { $in: filters.status.split(",") };

    const [tickets, total] = await Promise.all([
      Ticket.find(query).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
      Ticket.countDocuments(query),
    ]);

    return { tickets: tickets as ITicket[], meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
  }

  async findByIdForAuthor(ticketId: string, authorId: string): Promise<ITicket | null> {
    return Ticket.findOne({
      _id: new Types.ObjectId(ticketId),
      authorId: new Types.ObjectId(authorId),
    }).lean() as Promise<ITicket | null>;
  }

  async findWithFilters(pagination: PaginationParams, filters: TicketFilters): Promise<PaginatedTickets> {
    const query: Record<string, unknown> = {};

    if (filters.status) query.status = { $in: filters.status.split(",") };
    if (filters.category) query.category = filters.category;
    if (filters.priority) query.priority = { $in: filters.priority.split(",") };
    if (filters.assignedTo && filters.assignedTo !== "unassigned") {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }
    if (filters.assignedTo === "unassigned") query.assignedTo = null;
    if (filters.search) query.$text = { $search: filters.search };
    if (filters.authorId) query.authorId = new Types.ObjectId(filters.authorId);

    const sortField = filters.sortBy ?? "createdAt";
    const sortDirection = filters.sortOrder === "asc" ? 1 : -1;

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate("authorId", "name email authorId city")
        .populate("bookId", "title isbn status mrp totalCopiesSold royaltyPending")
        .populate("assignedTo", "name")
        .sort({ [sortField]: sortDirection })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Ticket.countDocuments(query),
    ]);

    return { tickets: tickets as ITicket[], meta: buildPaginationMeta(pagination.page, pagination.limit, total) };
  }

  async findByIdForAdmin(ticketId: string): Promise<ITicket | null> {
    return Ticket.findById(ticketId)
      .populate("authorId", "name email authorId phone city joinedDate")
      .populate("bookId", "title isbn genre status mrp totalCopiesSold totalRoyaltyEarned royaltyPaid royaltyPending lastRoyaltyPayoutDate availableOn")
      .populate("assignedTo", "name email")
      .lean() as Promise<ITicket | null>;
  }

  async getAdminDashboardStats(): Promise<{
    total: number; open: number; inProgress: number; resolved: number;
    critical: number; unassigned: number; oldestOpenDate: Date | null;
  }> {
    const [result] = await Ticket.aggregate([
      {
        $facet: {
          counts: [{
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $eq: ["$status", "Open"] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
              resolved: { $sum: { $cond: [{ $in: ["$status", ["Resolved", "Closed"]] }, 1, 0] } },
              critical: { $sum: { $cond: [{ $eq: ["$priority", "Critical"] }, 1, 0] } },
              unassigned: { $sum: { $cond: [{ $eq: ["$assignedTo", null] }, 1, 0] } },
            },
          }],
          oldest: [
            { $match: { status: "Open" } },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
            { $project: { createdAt: 1 } },
          ],
        },
      },
    ]);

    const counts = result?.counts?.[0] ?? {};
    return {
      total: counts.total ?? 0,
      open: counts.open ?? 0,
      inProgress: counts.inProgress ?? 0,
      resolved: counts.resolved ?? 0,
      critical: counts.critical ?? 0,
      unassigned: counts.unassigned ?? 0,
      oldestOpenDate: result?.oldest?.[0]?.createdAt ?? null,
    };
  }

  async create(data: Partial<ITicket>): Promise<ITicket> {
    const ticket = new Ticket(data);
    return ticket.save();
  }

  async findById(ticketId: string): Promise<ITicket | null> {
    return Ticket.findById(ticketId);
  }

  async updateById(ticketId: string, updates: Record<string, unknown>): Promise<ITicket | null> {
    return Ticket.findByIdAndUpdate(ticketId, { $set: updates }, { new: true }) as Promise<ITicket | null>;
  }

  async getAuthorActiveTicketCount(authorId: string): Promise<number> {
    return Ticket.countDocuments({
      authorId: new Types.ObjectId(authorId),
      status: { $in: ["Open", "In Progress"] },
    });
  }
}

export const ticketRepository = new TicketRepository();
