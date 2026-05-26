
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { adminApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { getSocket } from "@/lib/socket";
import { Ticket, PaginationMeta, TicketQueueFilters } from "@/types";

import { PageHeader, Card, Button, Spinner, EmptyState, PriorityBadge, StatusBadge } from "@/app/components/ui/index";
import { timeAgo, CATEGORY_ICONS, PRIORITY_CONFIG, cn } from "@/utils/formatters";

const DEFAULT_FILTERS: Partial<TicketQueueFilters> = {
  sortBy: "createdAt",
  sortOrder: "asc",
  page: 1,
};

export default function AdminTicketQueuePage() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filters, setFilters] = useState<Partial<TicketQueueFilters>>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [newTicketBanner, setNewTicketBanner] = useState(false);

  const loadTickets = useCallback(async (f: Partial<TicketQueueFilters>) => {
    setLoading(true);
    try {
      const result = await adminApi.getTicketQueue(f);
      setTickets(result.tickets);
      setMeta(result.meta ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets(filters);
  }, [filters, loadTickets]);

  // Real-time: show banner when new ticket arrives
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socket.on("ticket:created", () => {
      setNewTicketBanner(true);
    });
    return () => { socket.off("ticket:created"); };
  }, [token]);

  const updateFilter = (key: keyof TicketQueueFilters, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div>
      <PageHeader title="Ticket Queue" description="Manage all incoming author support tickets" />

      {/* New ticket banner */}
      {newTicketBanner && (
        <div
          className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 cursor-pointer"
          onClick={() => { setNewTicketBanner(false); loadTickets(filters); }}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-sm text-blue-800">New ticket received — click to refresh</p>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-5">
        <div className="px-5 py-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <select
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
              value={filters.status ?? ""}
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="Open,In Progress">Active</option>
              {["Open", "In Progress", "Resolved", "Closed"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Priority</label>
            <select
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
              value={filters.priority ?? ""}
              onChange={(e) => updateFilter("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {["Critical", "High", "Medium", "Low"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Category</label>
            <select
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
              value={filters.category ?? ""}
              onChange={(e) => updateFilter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {[
                "Royalty & Payments",
                "ISBN & Metadata Issues",
                "Printing & Quality",
                "Distribution & Availability",
                "Book Status & Production Updates",
                "General Inquiry",
              ].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Sort by</label>
            <select
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setFilters((p) => ({ ...p, sortBy: field, sortOrder: order as "asc" | "desc" }));
              }}
            >
              <option value="createdAt-asc">Oldest first</option>
              <option value="createdAt-desc">Newest first</option>
              <option value="updatedAt-desc">Recently updated</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-xs font-medium text-slate-500">Search</label>
            <input
              type="search"
              placeholder="Search by subject or description…"
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5"
              value={filters.search ?? ""}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>

          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </Card>

      {/* Results count */}
      {meta && (
        <p className="text-sm text-slate-500 mb-3">
          {meta.total} ticket{meta.total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : tickets.length === 0 ? (
        <EmptyState title="No tickets match your filters" description="Try adjusting or clearing the filters above." />
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <AdminTicketRow key={ticket._id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) - 1 }))}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={(filters.page ?? 1) >= meta.totalPages}
              onClick={() => setFilters(p => ({ ...p, page: (p.page ?? 1) + 1 }))}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminTicketRow({ ticket }: { ticket: Ticket }) {
  const priConfig = PRIORITY_CONFIG[ticket.priority];
  const author = typeof ticket.authorId === "object" ? ticket.authorId : null;
  const book = typeof ticket.bookId === "object" ? ticket.bookId : null;
  const isCritical = ticket.priority === "Critical";

  return (
    <Link href={`/admin/tickets/${ticket._id}`}>
      <Card className={cn(
        "hover:border-slate-300 transition-colors border-l-4",
        priConfig.border
      )}>
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="text-xs font-mono text-slate-400">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {!ticket.assignedTo && (
                <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">
                  Unassigned
                </span>
              )}
              {ticket.aiError && (
                <span className="text-xs text-amber-600">AI pending</span>
              )}
            </div>

            <p className="text-sm font-medium text-slate-900 mb-1">{ticket.subject}</p>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{author?.name ?? "Unknown"}</span>
              <span>·</span>
              <span>{CATEGORY_ICONS[ticket.category]} {ticket.category}</span>
              {book && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-32">{(book as any).title}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400">{timeAgo(ticket.createdAt)}</p>
            {isCritical && (
              <span className="text-xs text-red-600 font-medium block mt-1">⚠ Critical</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}