import { format, formatDistanceToNow, parseISO } from "date-fns";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatINR(amount: number | undefined | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd MMM yyyy, h:mm a");
  } catch {
    return "—";
  }
}

export function timeAgo(date: string | Date | undefined | null): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

// ─── Priority ─────────────────────────────────────────────────────────────────

export const PRIORITY_CONFIG = {
  Critical: {
    label: "Critical",
    color: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
    border: "border-l-red-500",
  },
  High: {
    label: "High",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
    border: "border-l-orange-400",
  },
  Medium: {
    label: "Medium",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    dot: "bg-yellow-500",
    border: "border-l-yellow-400",
  },
  Low: {
    label: "Low",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    border: "border-l-gray-300",
  },
} as const;

// ─── Status ───────────────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  Open: { label: "Open", color: "bg-blue-100 text-blue-800" },
  "In Progress": { label: "In Progress", color: "bg-purple-100 text-purple-800" },
  Resolved: { label: "Resolved", color: "bg-green-100 text-green-800" },
  Closed: { label: "Closed", color: "bg-gray-100 text-gray-600" },
} as const;

// ─── Book status ──────────────────────────────────────────────────────────────

export const BOOK_STATUS_CONFIG = {
  "Published & Live": { color: "bg-green-100 text-green-800" },
  Printing: { color: "bg-blue-100 text-blue-800" },
  "Distribution Setup": { color: "bg-blue-100 text-blue-800" },
  "Cover Design": { color: "bg-yellow-100 text-yellow-800" },
  Typesetting: { color: "bg-yellow-100 text-yellow-800" },
  Proofreading: { color: "bg-yellow-100 text-yellow-800" },
  "ISBN Assignment": { color: "bg-yellow-100 text-yellow-800" },
  Editing: { color: "bg-orange-100 text-orange-800" },
  "Manuscript Received": { color: "bg-gray-100 text-gray-600" },
} as const;

// ─── Category ─────────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, string> = {
  "Royalty & Payments": "💰",
  "ISBN & Metadata Issues": "📖",
  "Printing & Quality": "🖨️",
  "Distribution & Availability": "📦",
  "Book Status & Production Updates": "⚙️",
  "General Inquiry": "💬",
};

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}