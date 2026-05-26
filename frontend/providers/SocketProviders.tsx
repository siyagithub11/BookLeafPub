"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSocket, disconnectSocket } from "@/lib/socket";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket(token);

    socket.on("connect", () => {
      console.debug("[socket] connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.debug("[socket] disconnected:", reason);
    });

    return () => {
      // Don't fully disconnect on component remount — only on logout
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [isAuthenticated, token]);

  return <>{children}</>;
}