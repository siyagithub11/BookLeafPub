import { AuthGuard } from "@/providers/AuthGuard";
import { SocketProvider } from "@/providers/SocketProviders";
import { Sidebar } from "@/app/components/layout/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="admin">
      <SocketProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar role="admin" />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
          </main>
        </div>
      </SocketProvider>
    </AuthGuard>
  );
}