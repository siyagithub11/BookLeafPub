"use client";
import { create } from "zustand";
import { Ticket, Message } from "@/types";

interface TicketState {
  activeTicket: Ticket | null;
  messages: Message[];
  isLoadingTicket: boolean;

  setActiveTicket: (ticket: Ticket, messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  updateTicketFields: (changes: Partial<Ticket>) => void;
  clearActiveTicket: () => void;
  setLoading: (loading: boolean) => void;
}

export const useTicketStore = create<TicketState>()((set) => ({
  activeTicket: null,
  messages: [],
  isLoadingTicket: false,

  setActiveTicket: (ticket, messages) =>
    set({ activeTicket: ticket, messages, isLoadingTicket: false }),

  appendMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateTicketFields: (changes) =>
    set((state) => ({
      activeTicket: state.activeTicket
        ? { ...state.activeTicket, ...changes }
        : null,
    })),

  clearActiveTicket: () => set({ activeTicket: null, messages: [] }),

  setLoading: (loading) => set({ isLoadingTicket: loading }),
}));
