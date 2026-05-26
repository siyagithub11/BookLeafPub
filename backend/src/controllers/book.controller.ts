import { Request, Response } from "express";
import { bookRepository } from "../repositories/book.repository";
import { asyncHandler, successResponse, param } from "../utils/helpers";
import { NotFoundError } from "../errors/AppError";

export const getMyBooks = asyncHandler(async (req: Request, res: Response) => {
  const books = await bookRepository.findByAuthor(req.user!.id);
  return successResponse(res, { books });
});

export const getMyBookById = asyncHandler(async (req: Request, res: Response) => {
  const book = await bookRepository.findByIdForAuthor(param(req.params.id), req.user!.id);
  if (!book) throw new NotFoundError("Book");
  return successResponse(res, { book });
});

export const getAuthorDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await bookRepository.getAuthorDashboardStats(req.user!.id);
  return successResponse(res, { stats });
});