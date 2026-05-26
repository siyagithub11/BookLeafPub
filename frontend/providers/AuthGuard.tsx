"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Spinner } from "@/app/components/ui/index";

export function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: "author" | "admin";
}) {
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname));
      return;
    }

    if (user.role !== requiredRole) {
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/author/dashboard");
    }
  }, [isAuthenticated, isHydrated, user, requiredRole, router, pathname]);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}