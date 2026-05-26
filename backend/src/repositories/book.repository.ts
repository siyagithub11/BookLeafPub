


import { Types } from "mongoose";
import { Book, IBook } from "../models/Book.model";

export class BookRepository {
  async findByAuthor(authorId: string): Promise<IBook[]> {
    return Book.find({ authorId: new Types.ObjectId(authorId) })
      .sort({ createdAt: -1 })
      .lean() as Promise<IBook[]>;
  }

  async findByIdForAuthor(bookId: string, authorId: string): Promise<IBook | null> {
    return Book.findOne({
      _id: new Types.ObjectId(bookId),
      authorId: new Types.ObjectId(authorId),
    }).lean() as Promise<IBook | null>;
  }

  async findById(bookId: string): Promise<IBook | null> {
    return Book.findById(bookId).lean() as Promise<IBook | null>;
  }

  async getAuthorDashboardStats(authorId: string): Promise<{
    totalBooks: number;
    totalRoyaltyEarned: number;
    totalRoyaltyPending: number;
    publishedBooks: number;
  }> {
    const result = await Book.aggregate([
      { $match: { authorId: new Types.ObjectId(authorId) } },
      {
        $group: {
          _id: null,
          totalBooks: { $sum: 1 },
          totalRoyaltyEarned: { $sum: "$totalRoyaltyEarned" },
          totalRoyaltyPending: { $sum: "$royaltyPending" },
          publishedBooks: {
            $sum: { $cond: [{ $eq: ["$status", "Published & Live"] }, 1, 0] },
          },
        },
      },
    ]);

    return result[0] ?? { totalBooks: 0, totalRoyaltyEarned: 0, totalRoyaltyPending: 0, publishedBooks: 0 };
  }

  async create(data: Partial<IBook>): Promise<IBook> {
    const book = new Book(data);
    return book.save();
  }

  async upsertByBookId(bookId: string, data: Partial<IBook>): Promise<IBook> {
    return Book.findOneAndUpdate(
      { bookId },
      { $set: data },
      { upsert: true, new: true }
    ) as Promise<IBook>;
  }
}

export const bookRepository = new BookRepository();