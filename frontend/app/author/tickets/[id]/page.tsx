
"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ticketsApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useTicketStore } from "@/store/ticketStore";
import { getSocket } from "@/lib/socket";
import { Message, Ticket } from "@/types";
import {
  Card, CardBody, Button, Textarea, Spinner, EmptyState,
  PriorityBadge, StatusBadge,
} from "@/app/components/ui/index";
import { formatDateTime, CATEGORY_ICONS, cn } from "@/utils/formatters";
import { getApiErrorMessage } from "@/lib/axios";

export default function AuthorTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuthStore();
  const { activeTicket, messages, setActiveTicket, appendMessage } = useTicketStore();
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load ticket
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ticketsApi.getTicketById(id)
      .then(({ ticket, messages }) => setActiveTicket(ticket, messages))
      .finally(() => setLoading(false));
  }, [id, setActiveTicket]);

  // Socket: join ticket room, listen for new messages
  useEffect(() => {
    if (!token || !id) return;
    const socket = getSocket(token);
    socket.emit("join:ticket", id);

    socket.on("message:received", (data: { message: Message }) => {
      appendMessage(data.message);
    });

    socket.on("ticket:updated", (data: { ticketId: string; changes: Partial<Ticket> }) => {
      if (data.ticketId === id) {
        useTicketStore.getState().updateTicketFields(data.changes);
      }
    });

    return () => {
      socket.emit("leave:ticket", id);
      socket.off("message:received");
      socket.off("ticket:updated");
    };
  }, [token, id, appendMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || !id) return;
    setSendError(null);
    setSending(true);
    try {
      await ticketsApi.addMessage(id, reply.trim());
      setReply("");
    } catch (err) {
      setSendError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  if (!activeTicket) {
    return <EmptyState title="Ticket not found" />;
  }

  const isClosed = activeTicket.status === "Closed";

  return (
    <div className="max-w-3xl">
      {/* Ticket header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-slate-400 mb-1">{activeTicket.ticketNumber}</p>
            <h1 className="text-xl font-semibold text-slate-900">{activeTicket.subject}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={activeTicket.status} />
            <PriorityBadge priority={activeTicket.priority} />
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {CATEGORY_ICONS[activeTicket.category]} {activeTicket.category}
          {activeTicket.aiError && (
            <span className="ml-2 text-amber-600 text-xs">(AI classification pending)</span>
          )}
        </p>
      </div>

      {/* Conversation thread */}
      <Card className="mb-4">
        <div className="divide-y divide-slate-100">
          {/* Original query */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-400">{formatDateTime(activeTicket.createdAt)}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {activeTicket.description}
            </p>
          </div>

          {/* Replies */}
          {messages.map((msg) => {
            const isAuthor = msg.senderRole === "author";
            const sender = typeof msg.senderId === "object" ? msg.senderId : null;
            return (
              <div key={msg._id} className={cn("px-6 py-5", !isAuthor && "bg-blue-50/40")}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      isAuthor ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
                    )}
                  >
                    {isAuthor ? user?.name?.[0]?.toUpperCase() : "BL"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {isAuthor ? user?.name : "BookLeaf Support"}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(msg.createdAt)}</p>
                  </div>
                  {!isAuthor && msg.isFromAIDraft && (
                    <span className="text-xs text-slate-400 ml-auto">AI-assisted ✦</span>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {msg.message}
                </p>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              No replies yet. Our team will respond within 24-48 hours.
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>

      {/* Reply box */}
      {!isClosed ? (
        <Card>
          <CardBody>
            <Textarea
              placeholder="Add a reply or follow-up…"
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              disabled={sending}
            />
            {sendError && (
              <p className="text-sm text-red-600 mt-2">{sendError}</p>
            )}
            <div className="mt-3">
              <Button
                onClick={sendReply}
                loading={sending}
                disabled={!reply.trim()}
                size="sm"
              >
                Send reply
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="text-sm text-center text-slate-400 py-4">
          This ticket is closed. Submit a new ticket if you need further assistance.
        </div>
      )}
    </div>
  );
}