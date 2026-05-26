
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ticketsApi } from "@/services/api";
import { Ticket, PaginationMeta } from "@/types";
import { PageHeader, Card, Button, Spinner, EmptyState, PriorityBadge, StatusBadge } from "@/app/components/ui/index";
import { formatDate, CATEGORY_ICONS, timeAgo } from "@/utils/formatters";

const STATUS_FILTERS = ["All", "Open", "In Progress", "Resolved", "Closed"];

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const status = activeFilter === "All" ? undefined : activeFilter;
    ticketsApi
      .getMyTickets(page, status)
      .then(({ tickets, meta }) => {
        setTickets(tickets);
        setMeta(meta ?? null);
      })
      .finally(() => setLoading(false));
  }, [activeFilter, page]);

  return (
    <div>
      <PageHeader
        title="My Tickets"
        description="Track all your support requests"
        action={
          <Link href="/author/tickets/new">
            <Button size="sm">+ New ticket</Button>
          </Link>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setActiveFilter(f); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeFilter === f
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No tickets found"
          description="Submit a ticket if you have a question about your royalties, book status, or any other issue."
          action={
            <Link href="/author/tickets/new">
              <Button size="sm" variant="secondary">Submit a ticket</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <TicketRow key={ticket._id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} tickets)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === meta.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <Link href={`/author/tickets/${ticket._id}`}>
      <Card className="hover:border-slate-300 transition-colors">
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="text-xs font-mono text-slate-400">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <p className="text-sm font-medium text-slate-900">{ticket.subject}</p>
            <p className="text-xs text-slate-500 mt-1">
              {CATEGORY_ICONS[ticket.category]} {ticket.category}
              {ticket.aiError && (
                <span className="ml-2 text-amber-600">· AI processing pending</span>
              )}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400">{timeAgo(ticket.updatedAt)}</p>
            <p className="text-xs text-slate-300 mt-0.5">{formatDate(ticket.createdAt)}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}