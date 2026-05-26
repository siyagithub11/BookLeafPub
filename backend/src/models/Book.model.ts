import mongoose, { Document, Schema, Types } from "mongoose";

export const BOOK_STATUSES = [
  "Manuscript Received","Editing","Cover Design","Typesetting","Proofreading",
  "ISBN Assignment","Printing","Distribution Setup","Published & Live",
] as const;
export const PRINT_PARTNERS = ["In-House","Repro India","Epitome Books"] as const;
export const PLATFORMS = ["Amazon India","Flipkart","Amazon US","Amazon UK","BookLeaf Store"] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];
export type PrintPartner = (typeof PRINT_PARTNERS)[number];
export type Platform = (typeof PLATFORMS)[number];

export interface IBook extends Document {
  bookId: string; authorId: Types.ObjectId; title: string; isbn?: string; genre: string;
  publicationDate?: Date; status: BookStatus; mrp: number; printingCostPerCopy: number;
  authorRoyaltyPerCopy: number; totalCopiesSold: number; totalRoyaltyEarned: number;
  royaltyPaid: number; royaltyPending: number; lastRoyaltyPayoutDate?: Date;
  printPartner: PrintPartner; availableOn: Platform[]; description?: string;
  createdAt: Date; updatedAt: Date;
}

const bookSchema = new Schema<IBook>(
  {
    bookId: { type: String, required: true, unique: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true, sparse: true },
    genre: { type: String, required: true },
    publicationDate: { type: Date, default: null },
    status: { type: String, enum: BOOK_STATUSES, required: true, index: true },
    mrp: { type: Number, required: true, min: 0 },
    printingCostPerCopy: { type: Number, default: 0, min: 0 },
    authorRoyaltyPerCopy: { type: Number, default: 0, min: 0 },
    totalCopiesSold: { type: Number, default: 0, min: 0 },
    totalRoyaltyEarned: { type: Number, default: 0, min: 0 },
    royaltyPaid: { type: Number, default: 0, min: 0 },
    royaltyPending: { type: Number, default: 0, min: 0 },
    lastRoyaltyPayoutDate: { type: Date, default: null },
    printPartner: { type: String, enum: PRINT_PARTNERS, default: "In-House" },
    availableOn: { type: [String], default: [] },
    description: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

bookSchema.index({ authorId: 1, status: 1 });
bookSchema.index({ authorId: 1, createdAt: -1 });

bookSchema.pre("save", function () {
  this.royaltyPending = Math.max(0, this.totalRoyaltyEarned - this.royaltyPaid);
});

export const Book = mongoose.model<IBook>("Book", bookSchema);