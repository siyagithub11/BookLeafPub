"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { adminApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useTicketStore } from "@/store/ticketStore";
import { getSocket } from "@/lib/socket";
import { Message, Ticket, TicketCategory, TicketPriority, TicketStatus, InternalNote } from "@/types";
import {
  Card, CardBody, CardHeader, Button, Textarea, Select, Spinner, EmptyState,
  PriorityBadge, StatusBadge, Badge,
} from "@/app/components/ui/index";
import { formatDateTime, CATEGORY_ICONS, cn, timeAgo } from "@/utils/formatters";
import { getApiErrorMessage } from "@/lib/axios";

const CATEGORIES: TicketCategory[] = [
  "Royalty & Payments", "ISBN & Metadata Issues", "Printing & Quality",
  "Distribution & Availability", "Book Status & Production Updates", "General Inquiry",
];
const PRIORITIES: TicketPriority[] = ["Critical", "High", "Medium", "Low"];
const STATUSES: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuthStore();
  const { activeTicket, messages, setActiveTicket, appendMessage, updateTicketFields } = useTicketStore();

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<InternalNote[]>([]);

  // Reply state
  const [reply, setReply] = useState("");
  const [useDraft, setUseDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Note state
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // AI state
  const [regenerating, setRegenerating] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadTicket = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [{ ticket, messages }, fetchedNotes] = await Promise.all([
        adminApi.getTicketById(id),
        adminApi.getNotes(id),
      ]);
      setActiveTicket(ticket, messages);
      setNotes(fetchedNotes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTicket(); }, [id]);

  // Load AI draft into reply box when ticket loads
  useEffect(() => {
    if (activeTicket?.aiDraftResponse && !reply) {
      setReply(activeTicket.aiDraftResponse);
      setUseDraft(true);
    }
  }, [activeTicket?.aiDraftResponse]);

  // Socket
  useEffect(() => {
    if (!token || !id) return;
    const socket = getSocket(token);
    socket.emit("join:ticket", id);

    socket.on("message:received", (data: { message: Message }) => {
      appendMessage(data.message);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    socket.on("ticket:updated", (data: { ticketId: string; changes: Partial<Ticket> }) => {
      if (data.ticketId === id) updateTicketFields(data.changes);
    });

    socket.on("ticket:ai_ready", (data: { ticketId: string; aiDraftResponse?: string | null }) => {
      if (data.ticketId === id && data.aiDraftResponse && !reply) {
        updateTicketFields({ aiDraftResponse: data.aiDraftResponse ?? undefined });
        setReply(data.aiDraftResponse ?? "");
        setUseDraft(true);
      }
    });

    return () => {
      socket.emit("leave:ticket", id);
      socket.off("message:received");
      socket.off("ticket:updated");
      socket.off("ticket:ai_ready");
    };
  }, [token, id]);

  const sendReply = async () => {
    if (!reply.trim() || !id) return;
    setSending(true);
    setReplyError(null);
    try {
      await adminApi.sendReply(id, reply.trim(), useDraft);
      setReply("");
      setUseDraft(false);
    } catch (err) {
      setReplyError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const updateTicket = async (updates: Parameters<typeof adminApi.updateTicket>[1]) => {
    if (!id) return;
    try {
      await adminApi.updateTicket(id, updates);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const assignToMe = () => updateTicket({ assignedTo: user?.id ?? null });

  const addNote = async () => {
    if (!noteText.trim() || !id) return;
    setAddingNote(true);
    try {
      const note = await adminApi.addNote(id, noteText.trim());
      setNotes((prev) => [...prev, note]);
      setNoteText("");
    } finally {
      setAddingNote(false);
    }
  };

  const regenerateDraft = async () => {
    if (!id) return;
    setRegenerating(true);
    try {
      const draft = await adminApi.regenerateAIDraft(id);
      if (draft) {
        updateTicketFields({ aiDraftResponse: draft });
        setReply(draft);
        setUseDraft(true);
      }
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  if (!activeTicket) return <EmptyState title="Ticket not found" />;

  const author = typeof activeTicket.authorId === "object" ? activeTicket.authorId : null;
  const book = typeof activeTicket.bookId === "object" ? activeTicket.bookId : null;
  const assignedTo = typeof activeTicket.assignedTo === "object" ? activeTicket.assignedTo : null;

  return (
    <div className="flex gap-6">
      {/* ── Left: Conversation ── */}
      <div className="flex-1 min-w-0">
        <div className="mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-slate-400 mb-1">{activeTicket.ticketNumber}</p>
              <h1 className="text-lg font-semibold text-slate-900">{activeTicket.subject}</h1>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={activeTicket.status} />
              <PriorityBadge priority={activeTicket.priority} />
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1.5">
            {CATEGORY_ICONS[activeTicket.category]} {activeTicket.category}
            {activeTicket.categoryOverridden && <span className="text-xs ml-1 text-slate-400">(overridden)</span>}
          </p>
        </div>

        {/* Thread */}
        <Card className="mb-4">
          <div className="divide-y divide-slate-100">
            {/* Original description */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                  {author?.name?.[0]?.toUpperCase() ?? "A"}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{author?.name ?? "Author"}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(activeTicket.createdAt)}</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {activeTicket.description}
              </p>
            </div>

            {/* Messages */}
            {messages.map((msg) => {
              const isAdmin = msg.senderRole === "admin";
              return (
                <div key={msg._id} className={cn("px-6 py-5", isAdmin && "bg-blue-50/40")}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      isAdmin ? "bg-blue-600 text-white" : "bg-slate-800 text-white"
                    )}>
                      {isAdmin ? "BL" : (author?.name?.[0]?.toUpperCase() ?? "A")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {isAdmin ? "BookLeaf Support" : author?.name}
                      </p>
                      <p className="text-xs text-slate-400">{formatDateTime(msg.createdAt)}</p>
                    </div>
                    {isAdmin && msg.isFromAIDraft && (
                      <span className="ml-auto text-xs text-slate-400">AI-assisted ✦</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </Card>

        {/* Reply box */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">Reply to author</p>
              {activeTicket.aiDraftResponse && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setReply(activeTicket.aiDraftResponse!); setUseDraft(true); }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    ↩ Restore AI draft
                  </button>
                  <button
                    onClick={regenerateDraft}
                    disabled={regenerating}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    {regenerating ? "Regenerating…" : "↻ Regenerate"}
                  </button>
                </div>
              )}
            </div>
            {useDraft && reply === activeTicket.aiDraftResponse && (
              <p className="text-xs text-blue-600 mt-1">✦ Using AI draft — you can edit before sending</p>
            )}
          </CardHeader>
          <CardBody>
            <Textarea
              value={reply}
              onChange={(e) => { setReply(e.target.value); setUseDraft(false); }}
              rows={6}
              placeholder={activeTicket.aiDraftResponse
                ? "AI draft loaded above — edit or clear to write your own…"
                : "Write your response…"
              }
            />
            {replyError && <p className="text-sm text-red-600 mt-2">{replyError}</p>}
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={sendReply} loading={sending} disabled={!reply.trim()} size="sm">
                Send reply
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setReply(""); setUseDraft(false); }}>
                Clear
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Internal notes */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Internal Notes</h3>
          <div className="space-y-2 mb-3">
            {notes.map((note) => {
              const admin = typeof note.adminId === "object" ? note.adminId : null;
              return (
                <div key={note._id} className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-amber-900">{(admin as any)?.name ?? "Admin"}</p>
                    <p className="text-xs text-amber-600">{timeAgo(note.createdAt)}</p>
                  </div>
                  <p className="text-sm text-amber-800">{note.note}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm border border-slate-300 rounded-md px-3 py-2"
              placeholder="Add an internal note (not visible to author)…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addNote()}
            />
            <Button variant="secondary" size="sm" onClick={addNote} loading={addingNote} disabled={!noteText.trim()}>
              Add note
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right: Metadata panel ── */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* Author info */}
        <Card>
          <CardHeader><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Author</p></CardHeader>
          <CardBody className="py-3 space-y-1.5">
            <p className="text-sm font-medium text-slate-900">{author?.name ?? "—"}</p>
            <p className="text-xs text-slate-500">{author?.email ?? "—"}</p>
            {(author as any)?.city && <p className="text-xs text-slate-500">{(author as any).city}</p>}
            {(author as any)?.authorId && (
              <p className="text-xs text-slate-400 font-mono">{(author as any).authorId}</p>
            )}
          </CardBody>
        </Card>

        {/* Book info */}
        {book && (
          <Card>
            <CardHeader><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Book</p></CardHeader>
            <CardBody className="py-3 space-y-1.5">
              <p className="text-sm font-medium text-slate-900">{(book as any).title}</p>
              {(book as any).isbn && (
                <p className="text-xs font-mono text-slate-400">{(book as any).isbn}</p>
              )}
              <Badge className="text-xs">{(book as any).status}</Badge>
              {(book as any).royaltyPending > 0 && (
                <p className="text-xs text-amber-700 font-medium">
                  Pending: ₹{(book as any).royaltyPending?.toLocaleString("en-IN")}
                </p>
              )}
              {(book as any).totalCopiesSold != null && (
                <p className="text-xs text-slate-500">
                  {(book as any).totalCopiesSold} copies sold
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* AI Classification */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Analysis</p>
              {activeTicket.aiError && <span className="text-xs text-amber-600">Failed</span>}
            </div>
          </CardHeader>
          <CardBody className="py-3 space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Category {activeTicket.categoryOverridden && "(overridden)"}</p>
              <Select
                value={activeTicket.category}
                onChange={(e) => updateTicket({ category: e.target.value as TicketCategory })}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Priority {activeTicket.priorityOverridden && "(overridden)"}</p>
              <Select
                value={activeTicket.priority}
                onChange={(e) => updateTicket({ priority: e.target.value as TicketPriority })}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</p></CardHeader>
          <CardBody className="py-3 space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <Select
                value={activeTicket.status}
                onChange={(e) => updateTicket({ status: e.target.value as TicketStatus })}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Assigned to</p>
              <p className="text-sm text-slate-900 mb-1.5">
                {assignedTo ? (assignedTo as any).name : (
                  <span className="text-orange-600">Unassigned</span>
                )}
              </p>
              {!assignedTo && (
                <Button variant="secondary" size="sm" onClick={assignToMe} className="w-full">
                  Assign to me
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
