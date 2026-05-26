import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { Types } from "mongoose";
import { AppError, ValidationError, NotFoundError } from "../errors/AppError";
import { logger } from "../config/logger";
import { env } from "../config/env";

export function validate(
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fieldErrors = result.error.flatten()
        .fieldErrors as Record<string, string[]>;
      return next(new ValidationError("Validation failed", fieldErrors));
    }
    (req[source] as unknown) = result.data;
    next();
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Always log full error so we can see it in terminal
  console.error("=== ERROR ===");
  console.error("Path:", req.method, req.path);
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  console.error("=============");

  if (err instanceof AppError && err.isOperational) {
    logger.warn("Operational error", {
      code: err.code,
      message: err.message,
      path: req.path,
    });
  } else {
    logger.error("Unexpected error", {
      message: err.message,
      stack: err.stack,
      path: req.path,
    });
  }

  const errAsAny = err as unknown as Record<string, unknown>;
  if (errAsAny.code === 11000) {
    res.status(409).json({
      success: false,
      message: "Resource already exists",
      code: "CONFLICT",
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Please try again.",
    code: "INTERNAL_ERROR",
    ...(env.NODE_ENV === "development" && {
      debug: { message: err.message, stack: err.stack },
    }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: "Cannot " + req.method + " " + req.path,
    code: "NOT_FOUND",
  });
}

/**
 * Middleware to validate :id parameter is a valid MongoDB ObjectId.
 * Prevents "new" and other non-ObjectId strings from being treated as IDs.
 */
export function validateObjectId(req: Request, _res: Response, next: NextFunction): void {
  const id = req.params.id;
  if (id && !Types.ObjectId.isValid(id)) {
    return next(new NotFoundError("Ticket"));
  }
  next();
}