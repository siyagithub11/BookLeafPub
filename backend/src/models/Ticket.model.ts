
import mongoose, { Document, Schema, Types } from "mongoose";

export const TICKET_CATEGORIES = [
  "Royalty & Payments","ISBN & Metadata Issues","Printing & Quality",
  "Distribution & Availability","Book Status & Production Updates","General Inquiry",
] as const;
export const TICKET_PRIORITIES = ["Critical","High","Medium","Low"] as const;
export const TICKET_STATUSES = ["Open","In Progress","Resolved","Closed"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface ITicket extends Document {
  ticketNumber: string; authorId: Types.ObjectId; bookId?: Types.ObjectId;
  subject: string; description: string; category: TicketCategory;
  priority: TicketPriority; status: TicketStatus; assignedTo?: Types.ObjectId;
  aiClassification?: string; aiPriority?: string; aiDraftResponse?: string;
  aiProcessedAt?: Date; aiError: boolean; aiErrorMessage?: string;
  categoryOverridden: boolean; priorityOverridden: boolean;
  attachments: string[]; resolvedAt?: Date; createdAt: Date; updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: "Book", default: null },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, default: "General Inquiry", index: true },
    priority: { type: String, enum: TICKET_PRIORITIES, default: "Medium", index: true },
    status: { type: String, enum: TICKET_STATUSES, default: "Open", index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    aiClassification: { type: String, default: null }, aiPriority: { type: String, default: null },
    aiDraftResponse: { type: String, default: null }, aiProcessedAt: { type: Date, default: null },
    aiError: { type: Boolean, default: false }, aiErrorMessage: { type: String, default: null },
    categoryOverridden: { type: Boolean, default: false }, priorityOverridden: { type: Boolean, default: false },
    attachments: { type: [String], default: [] }, resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

ticketSchema.index({ status: 1, priority: 1, createdAt: 1 });
ticketSchema.index({ authorId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ category: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ subject: "text", description: "text" });

ticketSchema.pre("save", function () {
  if (this.isModified("status") && (this.status === "Resolved" || this.status === "Closed") && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
});

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
