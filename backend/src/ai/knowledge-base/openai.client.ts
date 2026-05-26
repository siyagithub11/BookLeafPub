
import OpenAI from "openai";
import { env } from "../config/env";
import { logger } from "../config/logger";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 30000, // 30 second timeout
      maxRetries: 2,
    });
  }
  return client;
}

// Wraps an OpenAI call with consistent error handling and logging
export async function callOpenAI<T>(
  operation: string,
  fn: (client: OpenAI) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const start = Date.now();
  try {
    const openai = getOpenAIClient();
    const result = await fn(openai);
    logger.debug("OpenAI call succeeded", {
      operation,
      durationMs: Date.now() - start,
    });
    return { success: true, data: result };
  } catch (err) {
    const error = err as Error & { status?: number; code?: string };
    logger.error("OpenAI call failed", {
      operation,
      durationMs: Date.now() - start,
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return { success: false, error: error.message };
  }
}
