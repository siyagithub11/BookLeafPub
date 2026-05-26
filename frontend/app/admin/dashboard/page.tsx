"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/services/api";
import { AdminStats, Ticket } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { getSocket } from "@/lib/socket";
import { StatCard, PageHeader, Card, Spinner, PriorityBadge, StatusBadge } from "@/app/components/ui/index";
import { timeAgo, CATEGORY_ICONS, formatDate } from "@/utils/formatters";

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [liveTickets, setLiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [s, { tickets }] = await Promise.all([
      adminApi.getStats(),
      adminApi.getTicketQueue({ status: "Open,In Progress", sortBy: "createdAt", sortOrder: "asc", limit: 8 } as any),
    ]);
    setStats(s);
    setLiveTickets(tickets);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen for new tickets in real time
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on("ticket:created", (data: { ticket: Ticket }) => {
      setStats((prev) => prev ? { ...prev, total: prev.total + 1, open: prev.open + 1 } : prev);
      setLiveTickets((prev) => [data.ticket, ...prev.slice(0, 7)]);
    });

    socket.on("ticket:updated", () => {
      // Refresh stats on any status change
      adminApi.getStats().then(setStats);
    });

    return () => {
      socket.off("ticket:created");
      socket.off("ticket:updated");
    };
  }, [token]);

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Support Dashboard"
        description="Real-time view of author support operations"
        action={
          <Link href="/admin/tickets" className="text-sm text-slate-600 hover:text-slate-900">
            View all tickets →
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Tickets" value={stats?.total ?? 0} />
        <StatCard label="Open" value={stats?.open ?? 0} />
        <StatCard label="In Progress" value={stats?.inProgress ?? 0} />
        <StatCard label="Resolved" value={stats?.resolved ?? 0} />
        <StatCard label="Critical" value={stats?.critical ?? 0} highlight={(stats?.critical ?? 0) > 0} />
        <StatCard
          label="Unassigned"
          value={stats?.unassigned ?? 0}
          highlight={(stats?.unassigned ?? 0) > 0}
        />
      </div>

      {/* Oldest open alert */}
      {stats?.oldestOpenDate && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-800">
            Oldest open ticket: <strong>{formatDate(stats.oldestOpenDate)}</strong> — {timeAgo(stats.oldestOpenDate)}
          </p>
          <Link href="/admin/tickets?sortBy=createdAt&sortOrder=asc" className="ml-auto text-xs text-amber-700 underline">
            View oldest first
          </Link>
        </div>
      )}

      {/* Recent unresolved tickets */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Unresolved Tickets</h2>
          <Link href="/admin/tickets?status=Open,In Progress" className="text-xs text-slate-500 hover:text-slate-900">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {liveTickets.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              🎉 No open tickets right now
            </div>
          ) : (
            liveTickets.map((ticket) => {
              const author = typeof ticket.authorId === "object" ? ticket.authorId : null;
              return (
                <Link
                  key={ticket._id}
                  href={`/admin/tickets/${ticket._id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{ticket.ticketNumber}</span>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      {!ticket.assignedTo && (
                        <span className="text-xs text-orange-600 font-medium">Unassigned</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">{ticket.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {author?.name ?? "Unknown Author"} · {CATEGORY_ICONS[ticket.category]} {ticket.category}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">{timeAgo(ticket.createdAt)}</p>
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
