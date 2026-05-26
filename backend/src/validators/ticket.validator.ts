import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createTicketSchema = z.object({
  bookId: z.string().optional().nullable(),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200).trim(),
  description: z.string().min(20, "Please provide more detail").trim(),
});

export const updateTicketSchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
});

export const addMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(5000).trim(),
  isFromAIDraft: z.boolean().optional().default(false),
});

export const addNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(2000).trim(),
});