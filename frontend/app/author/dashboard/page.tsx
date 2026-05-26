
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { booksApi, ticketsApi } from "@/services/api";
import { AuthorStats, Ticket } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { StatCard, Card, CardBody, PageHeader, Button, Spinner, EmptyState } from "@/app/components/ui/index";
import { formatINR, formatDate, STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_ICONS } from "@/utils/formatters";

export default function AuthorDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AuthorStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      booksApi.getDashboardStats(),
      ticketsApi.getMyTickets(1),
    ])
      .then(([s, t]) => {
        setStats(s);
        setRecentTickets(t.tickets.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0]}`}
        description="Here's a summary of your publishing activity"
        action={
          <Link href="/author/tickets/new">
            <Button size="sm">+ New ticket</Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Books"
          value={stats?.totalBooks ?? 0}
          sub={`${stats?.publishedBooks ?? 0} published`}
        />
        <StatCard
          label="Total Royalties"
          value={formatINR(stats?.totalRoyaltyEarned)}
        />
        <StatCard
          label="Royalty Pending"
          value={formatINR(stats?.totalRoyaltyPending)}
          highlight={(stats?.totalRoyaltyPending ?? 0) > 0}
        />
        <StatCard
          label="Active Tickets"
          value={recentTickets.filter(t => t.status === "Open" || t.status === "In Progress").length}
        />
      </div>

      {/* Recent tickets */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent Tickets</h2>
          <Link href="/author/tickets" className="text-xs text-slate-500 hover:text-slate-900">
            View all →
          </Link>
        </div>
        {recentTickets.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            description="Have a question about your royalties or book status? Submit a support ticket."
            action={
              <Link href="/author/tickets/new">
                <Button size="sm" variant="secondary">Submit your first ticket</Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status];
              const priCfg = PRIORITY_CONFIG[ticket.priority];
              return (
                <Link
                  key={ticket._id}
                  href={`/author/tickets/${ticket._id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400 font-mono">{ticket.ticketNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                        {ticket.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${priCfg.color}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">{ticket.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {CATEGORY_ICONS[ticket.category]} {ticket.category} · {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}