// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = "author" | "admin";

export interface User {
  id: string;
  authorId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  city?: string;
  joinedDate?: string;
}

// ─── Books ────────────────────────────────────────────────────────────────────

export type BookStatus =
  | "Manuscript Received"
  | "Editing"
  | "Cover Design"
  | "Typesetting"
  | "Proofreading"
  | "ISBN Assignment"
  | "Printing"
  | "Distribution Setup"
  | "Published & Live";

export type Platform =
  | "Amazon India"
  | "Flipkart"
  | "Amazon US"
  | "Amazon UK"
  | "BookLeaf Store";

export interface Book {
  _id: string;
  bookId: string;
  authorId: string;
  title: string;
  isbn?: string;
  genre: string;
  publicationDate?: string;
  status: BookStatus;
  mrp: number;
  printingCostPerCopy: number;
  authorRoyaltyPerCopy: number;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate?: string;
  printPartner: string;
  availableOn: Platform[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export type TicketCategory =
  | "Royalty & Payments"
  | "ISBN & Metadata Issues"
  | "Printing & Quality"
  | "Distribution & Availability"
  | "Book Status & Production Updates"
  | "General Inquiry";

export type TicketPriority = "Critical" | "High" | "Medium" | "Low";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";

export interface Ticket {
  _id: string;
  ticketNumber: string;
  authorId: User | string;
  bookId?: Book | string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: User | string | null;
  aiClassification?: string;
  aiPriority?: string;
  aiDraftResponse?: string;
  aiProcessedAt?: string;
  aiError: boolean;
  categoryOverridden: boolean;
  priorityOverridden: boolean;
  attachments: string[];
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface Message {
  _id: string;
  ticketId: string;
  senderId: User | string;
  senderRole: "author" | "admin";
  message: string;
  isFromAIDraft: boolean;
  attachments: string[];
  createdAt: string;
}

export interface InternalNote {
  _id: string;
  ticketId: string;
  adminId: User | string;
  note: string;
  createdAt: string;
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface AuthorStats {
  totalBooks: number;
  totalRoyaltyEarned: number;
  totalRoyaltyPending: number;
  publishedBooks: number;
}

export interface AdminStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  unassigned: number;
  oldestOpenDate: string | null;
}

// ─── Form inputs ──────────────────────────────────────────────────────────────

export interface CreateTicketInput {
  bookId?: string | null;
  subject: string;
  description: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Filter state ─────────────────────────────────────────────────────────────

export interface TicketQueueFilters {
  status: string;
  category: string;
  priority: string;
  assignedTo: string;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
}


