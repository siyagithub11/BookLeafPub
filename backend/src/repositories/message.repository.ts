import { Types } from "mongoose";
import { Message, IMessage } from "../models/Message.model";
import { InternalNote, IInternalNote } from "../models/InternalNote.model";

export class MessageRepository {
  async findByTicket(ticketId: string): Promise<IMessage[]> {
    return Message.find({ ticketId: new Types.ObjectId(ticketId) })
      .populate("senderId", "name role authorId")
      .sort({ createdAt: 1 })
      .lean() as Promise<IMessage[]>;
  }

  async create(data: {
    ticketId: string;
    senderId: string;
    senderRole: "author" | "admin";
    message: string;
    isFromAIDraft?: boolean;
  }): Promise<IMessage> {
    const message = new Message({
      ticketId: new Types.ObjectId(data.ticketId),
      senderId: new Types.ObjectId(data.senderId),
      senderRole: data.senderRole,
      message: data.message,
      isFromAIDraft: data.isFromAIDraft ?? false,
    });
    return message.save();
  }
}

export class InternalNoteRepository {
  async findByTicket(ticketId: string): Promise<IInternalNote[]> {
    return InternalNote.find({ ticketId: new Types.ObjectId(ticketId) })
      .populate("adminId", "name")
      .sort({ createdAt: 1 })
      .lean() as Promise<IInternalNote[]>;
  }

  async create(data: { ticketId: string; adminId: string; note: string }): Promise<IInternalNote> {
    const note = new InternalNote({
      ticketId: new Types.ObjectId(data.ticketId),
      adminId: new Types.ObjectId(data.adminId),
      note: data.note,
    });
    return note.save();
  }
}

export const messageRepository = new MessageRepository();
export const internalNoteRepository = new InternalNoteRepository();