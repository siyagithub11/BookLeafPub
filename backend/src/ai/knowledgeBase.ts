import fs from "fs";
import path from "path";
import { TicketCategory } from "../models/Ticket.model";
import { logger } from "../config/logger";

const KB_DIR = path.join(__dirname, "knowledge-base");

// Maps ticket categories to their knowledge base files
const CATEGORY_TO_KB_FILE: Record<TicketCategory, string> = {
  "Royalty & Payments": "royalty.md",
  "ISBN & Metadata Issues": "isbn.md",
  "Printing & Quality": "printing.md",
  "Distribution & Availability": "distribution.md",
  "Book Status & Production Updates": "production.md",
  "General Inquiry": "general.md",
};

// Cache loaded KB content in memory — files don't change at runtime
const kbCache = new Map<string, string>();

export function loadKnowledgeBase(category: TicketCategory): string {
  const filename = CATEGORY_TO_KB_FILE[category];

  if (kbCache.has(filename)) {
    return kbCache.get(filename)!;
  }

  const filePath = path.join(KB_DIR, filename);

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    kbCache.set(filename, content);
    return content;
  } catch (err) {
    logger.warn("Knowledge base file not found, using empty context", {
      filename,
      category,
    });
    return "";
  }
}

export function clearKBCache(): void {
  kbCache.clear();
}