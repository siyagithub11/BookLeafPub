
import { TicketCategory } from "../models/Ticket.model";
import { callOpenAI } from "./openai.client";
import { loadKnowledgeBase } from "./knowledgeBase";
import { env } from "../config/env";
import { logger } from "../config/logger";

interface DraftContext {
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  author: {
    name: string;
    joinedDate?: Date;
  };
  book?: {
    title: string;
    isbn?: string;
    status: string;
    mrp?: number;
    totalCopiesSold?: number;
    royaltyPending?: number;
    totalRoyaltyEarned?: number;
    lastRoyaltyPayoutDate?: Date;
    availableOn?: string[];
  } | null;
}

function buildSystemPrompt(category: TicketCategory, kbContent: string): string {
  return `You are a senior author support representative at BookLeaf Publishing.

BookLeaf is a self-publishing company. Authors are our partners — treat them with genuine care and respect.

--- BOOKLEAF KNOWLEDGE BASE (${category}) ---
${kbContent}
--- END KNOWLEDGE BASE ---

RESPONSE GUIDELINES:
1. Address the author by their first name
2. Acknowledge their specific concern in the first sentence — don't jump straight to the solution
3. Reference their actual data (book title, ISBN, royalty amounts, dates) when provided — this shows you actually looked at their account
4. Be specific about timelines. "We'll look into it" is not acceptable. "Our team will investigate and update you within 48 hours" is.
5. If it's BookLeaf's fault, own it directly and without corporate deflection
6. End with ONE clear next step — either what the author needs to do, or what BookLeaf will do
7. Keep the response professional but warm — not stiff corporate language
8. Do NOT use generic AI phrases like "I understand your concern", "Thank you for reaching out", "I hope this helps"
9. Write as if you personally looked at their account and are personally committing to help them
10. Length: 150-250 words. Substantive but not overwhelming.`;
}

function buildUserPrompt(ctx: DraftContext): string {
  const authorInfo = [
    `Author: ${ctx.author.name}`,
    ctx.author.joinedDate
      ? `Member since: ${new Date(ctx.author.joinedDate).getFullYear()}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const bookInfo = ctx.book
    ? [
        `Book: "${ctx.book.title}"`,
        ctx.book.isbn ? `ISBN: ${ctx.book.isbn}` : "ISBN: Not yet assigned",
        `Status: ${ctx.book.status}`,
        ctx.book.mrp ? `MRP: ₹${ctx.book.mrp}` : null,
        ctx.book.totalCopiesSold != null
          ? `Copies Sold: ${ctx.book.totalCopiesSold}`
          : null,
        ctx.book.royaltyPending != null
          ? `Royalty Pending: ₹${ctx.book.royaltyPending}`
          : null,
        ctx.book.totalRoyaltyEarned != null
          ? `Total Royalty Earned: ₹${ctx.book.totalRoyaltyEarned}`
          : null,
        ctx.book.lastRoyaltyPayoutDate
          ? `Last Payout: ${new Date(ctx.book.lastRoyaltyPayoutDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
          : "Last Payout: None",
        ctx.book.availableOn?.length
          ? `Available On: ${ctx.book.availableOn.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Book: General account-level query (not book-specific)";

  return `TICKET #${ctx.ticketNumber}
Category: ${ctx.category}

${authorInfo}
${bookInfo}

AUTHOR'S QUERY:
Subject: ${ctx.subject}

${ctx.description}

---
Write a response to this author. Do not include a subject line or "Dear" header — start directly with the content.`;
}

export async function generateDraftResponse(ctx: DraftContext): Promise<string | null> {
  const kbContent = loadKnowledgeBase(ctx.category);
  const systemPrompt = buildSystemPrompt(ctx.category, kbContent);
  const userPrompt = buildUserPrompt(ctx);

  const result = await callOpenAI("generate_draft", (client) =>
    client.chat.completions.create({
      model: env.OPENAI_MODEL,
      max_tokens: 400,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })
  );

  if (!result.success) {
    logger.warn("Draft generation failed", {
      ticketNumber: ctx.ticketNumber,
      category: ctx.category,
    });
    return null;
  }

  return result.data.choices[0]?.message?.content?.trim() ?? null;
}