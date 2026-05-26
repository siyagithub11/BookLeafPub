import api from "@/lib/axios";
import {
  ApiResponse,
  User,
  Book,
  Ticket,
  Message,
  InternalNote,
  AuthorStats,
  AdminStats,
  PaginationMeta,
  CreateTicketInput,
  LoginInput,
  TicketQueueFilters,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/types";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (data: LoginInput) => {
    const res = await api.post<ApiResponse<{ user: User; token?: string }>>("/auth/login", data);
    return res.data.data;
  },

  logout: async () => {
    await api.post("/auth/logout");
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<{ user: User }>>("/auth/me");
    return res.data.data.user;
  },
};

// ─── Books ────────────────────────────────────────────────────────────────────

export const booksApi = {
  getMyBooks: async () => {
    const res = await api.get<ApiResponse<{ books: Book[] }>>("/books");
    return res.data.data.books;
  },

  getBookById: async (id: string) => {
    const res = await api.get<ApiResponse<{ book: Book }>>(`/books/${id}`);
    return res.data.data.book;
  },

  getDashboardStats: async () => {
    const res = await api.get<ApiResponse<{ stats: AuthorStats }>>("/books/stats");
    return res.data.data.stats;
  },
};

// ─── Author Tickets ───────────────────────────────────────────────────────────

export const ticketsApi = {
  createTicket: async (data: CreateTicketInput) => {
    const res = await api.post<ApiResponse<{ ticket: Ticket }>>("/tickets", data);
    return res.data.data.ticket;
  },

  getMyTickets: async (page = 1, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (status) params.append("status", status);
    const res = await api.get<ApiResponse<{ tickets: Ticket[] }> & { meta: PaginationMeta }>(
      `/tickets?${params}`
    );
    return { tickets: res.data.data.tickets, meta: res.data.meta };
  },

  getTicketById: async (id: string) => {
    const res = await api.get<ApiResponse<{ ticket: Ticket; messages: Message[] }>>(
      `/tickets/${id}`
    );
    return res.data.data;
  },

  addMessage: async (ticketId: string, message: string) => {
    const res = await api.post<ApiResponse<{ message: Message }>>(
      `/tickets/${ticketId}/messages`,
      { message }
    );
    return res.data.data.message;
  },
};

// ─── Admin Tickets ────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: async () => {
    const res = await api.get<ApiResponse<{ stats: AdminStats }>>("/admin/stats");
    return res.data.data.stats;
  },

  getTicketQueue: async (filters: Partial<TicketQueueFilters>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== "") params.append(key, String(val));
    });
    const res = await api.get<{ success: boolean; data: { tickets: Ticket[] }; meta: PaginationMeta }>(
      `/admin/tickets?${params}`
    );
    return { tickets: res.data.data.tickets, meta: res.data.meta };
  },

  getTicketById: async (id: string) => {
    const res = await api.get<ApiResponse<{ ticket: Ticket; messages: Message[] }>>(
      `/admin/tickets/${id}`
    );
    return res.data.data;
  },

  updateTicket: async (
    id: string,
    updates: {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      assignedTo?: string | null;
    }
  ) => {
    const res = await api.patch<ApiResponse<{ ticket: Ticket }>>(
      `/admin/tickets/${id}`,
      updates
    );
    return res.data.data.ticket;
  },

  sendReply: async (
    ticketId: string,
    message: string,
    isFromAIDraft: boolean
  ) => {
    const res = await api.post<ApiResponse<{ message: Message }>>(
      `/admin/tickets/${ticketId}/messages`,
      { message, isFromAIDraft }
    );
    return res.data.data.message;
  },

  addNote: async (ticketId: string, note: string) => {
    const res = await api.post<ApiResponse<{ note: InternalNote }>>(
      `/admin/tickets/${ticketId}/notes`,
      { note }
    );
    return res.data.data.note;
  },

  getNotes: async (ticketId: string) => {
    const res = await api.get<ApiResponse<{ notes: InternalNote[] }>>(
      `/admin/tickets/${ticketId}/notes`
    );
    return res.data.data.notes;
  },

  regenerateAIDraft: async (ticketId: string) => {
    const res = await api.post<ApiResponse<{ aiDraftResponse: string | null }>>(
      `/admin/tickets/${ticketId}/ai/regenerate`
    );
    return res.data.data.aiDraftResponse;
  },
};