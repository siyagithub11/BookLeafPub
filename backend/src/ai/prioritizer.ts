
import { TICKET_PRIORITIES, TicketCategory, TicketPriority } from "../models/Ticket.model";
import { callOpenAI } from "./openai.client";
import { env } from "../config/env";
import { logger } from "../config/logger";

const VALID_PRIORITIES = new Set<string>(TICKET_PRIORITIES);

const SYSTEM_PROMPT = `You are a support ticket priority assessor for BookLeaf Publishing.

Assign a priority level to the support ticket based on urgency and business impact.

Priority levels:
- Critical: Financial loss in progress, legal threat, publication completely blocked, royalties unpaid for 3+ months, ISBN completely wrong
- High: Significant royalty dispute, ISBN mismatch, book delisted, quality issues with author's copies, payment overdue 1-3 months
- Medium: Printing quality concern, book unavailable temporarily, production delayed, general royalty questions
- Low: Cosmetic updates, metadata changes, general inquiries, author bio updates, questions about process

Rules:
- Respond with ONLY ONE WORD: Critical, High, Medium, or Low
- No explanation, no punctuation, just the priority word
- When in doubt, choose the higher priority — it's better to over-escalate than under-escalate`;

export async function scoreTicketPriority(
  subject: string,
  description: string,
  category: TicketCategory
): Promise<TicketPriority> {
  const result = await callOpenAI("score_priority", (client) =>
    client.chat.completions.create({
      model: env.OPENAI_MODEL,
      max_tokens: 10,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Category: ${category}\nSubject: ${subject}\n\nDescription: ${description.slice(0, 600)}`,
        },
      ],
    })
  );

  if (!result.success) {
    logger.warn("Priority scoring failed, using default", { subject });
    return "Medium";
  }

  const rawPriority = result.data.choices[0]?.message?.content?.trim() ?? "";

  if (VALID_PRIORITIES.has(rawPriority)) {
    return rawPriority as TicketPriority;
  }

  // Case-insensitive fallback
  const matched = TICKET_PRIORITIES.find(
    (p) => p.toLowerCase() === rawPriority.toLowerCase()
  );

  if (matched) return matched;

  logger.warn("AI returned unknown priority, using default", {
    rawPriority,
    subject,
  });

  return "Medium";
}