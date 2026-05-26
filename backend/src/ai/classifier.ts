
import { TICKET_CATEGORIES, TicketCategory } from "../models/Ticket.model";
import { callOpenAI } from "./openai.client";
import { env } from "../config/env";
import { logger } from "../config/logger";

const VALID_CATEGORIES = new Set<string>(TICKET_CATEGORIES);

const SYSTEM_PROMPT = `You are a support ticket classifier for BookLeaf Publishing, a self-publishing company.

Classify the incoming support ticket into EXACTLY ONE of these categories:
- Royalty & Payments
- ISBN & Metadata Issues
- Printing & Quality
- Distribution & Availability
- Book Status & Production Updates
- General Inquiry

Rules:
- Respond with ONLY the category name. No punctuation, no explanation, no extra text.
- If the ticket mentions unpaid royalties, payment amounts, or royalty calculations → "Royalty & Payments"
- If the ticket mentions ISBN numbers, metadata, book descriptions → "ISBN & Metadata Issues"
- If the ticket mentions print quality, defects, misprints, binding → "Printing & Quality"
- If the ticket mentions Amazon, Flipkart, availability, "out of stock" → "Distribution & Availability"
- If the ticket asks about editing, typesetting, cover design, publication timeline → "Book Status & Production Updates"
- Everything else → "General Inquiry"`;

export async function classifyTicket(
  subject: string,
  description: string
): Promise<TicketCategory> {
  const result = await callOpenAI("classify_ticket", (client) =>
    client.chat.completions.create({
      model: env.OPENAI_MODEL,
      max_tokens: 20,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Subject: ${subject}\n\nDescription: ${description.slice(0, 500)}`,
        },
      ],
    })
  );

  if (!result.success) {
    logger.warn("Ticket classification failed, using default", { subject });
    return "General Inquiry";
  }

  const rawCategory = result.data.choices[0]?.message?.content?.trim() ?? "";

  // Validate the output is one of our known categories
  if (VALID_CATEGORIES.has(rawCategory)) {
    return rawCategory as TicketCategory;
  }

  // Fuzzy match — model sometimes adds punctuation or slight variations
  const matched = TICKET_CATEGORIES.find(
    (c) => c.toLowerCase() === rawCategory.toLowerCase()
  );

  if (matched) return matched;

  logger.warn("AI returned unknown category, using default", {
    rawCategory,
    subject,
  });

  return "General Inquiry";
}