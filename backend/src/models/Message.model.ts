import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessage extends Document {
  ticketId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: "author" | "admin";
  message: string;
  isFromAIDraft: boolean;
  attachments: string[];
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["author", "admin"], required: true },
    message: { type: String, required: true, trim: true },
    isFromAIDraft: { type: Boolean, default: false },
    attachments: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

messageSchema.index({ ticketId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);