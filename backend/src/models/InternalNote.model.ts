import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInternalNote extends Document {
  ticketId: Types.ObjectId;
  adminId: Types.ObjectId;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const internalNoteSchema = new Schema<IInternalNote>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false }
);

internalNoteSchema.index({ ticketId: 1, createdAt: 1 });

export const InternalNote = mongoose.model<IInternalNote>("InternalNote", internalNoteSchema);
