"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { authApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { Button, Input, Spinner } from "@/app/components/ui/index";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { setUser, isAuthenticated, user, isHydrated } = useAuthStore();

  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isHydrated && isAuthenticated && user) {
      router.replace(
        user.role === "admin"
          ? "/admin/dashboard"
          : "/author/dashboard"
      );
    }
  }, [isHydrated, isAuthenticated, user, router]);

  const onSubmit = async (data: LoginForm) => {
    setError(null);

    try {
      const response = await authApi.login(data);

      console.log("LOGIN RESPONSE:", response);

      setUser(response.user);

      console.log(
        "LOCAL STORAGE:",
        localStorage.getItem("bookleaf-auth")
      );

      const redirect = searchParams.get("redirect");

      router.push(
        redirect ??
          (response.user.role === "admin"
            ? "/admin/dashboard"
            : "/author/dashboard")
      );
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(getApiErrorMessage(err));
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue("email", email);
    setValue("password", password);
  };

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl mb-3">
            <span className="text-amber-400 text-lg font-bold">BL</span>
          </div>

          <h1 className="text-xl font-semibold text-slate-900">
            BookLeaf Publishing
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Sign in to your portal
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full"
            >
              Sign in
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">
            Demo accounts
          </p>

          <div className="space-y-2">
            {[
              {
                label: "Admin",
                sub: "admin@bookleaf.in",
                email: "admin@bookleaf.in",
                pw: "Admin@123",
              },
              {
                label: "Priya Sharma",
                sub: "priya.sharma@email.com",
                email: "priya.sharma@email.com",
                pw: "Author@123",
              },
              {
                label: "Rohit Kapoor",
                sub: "rohit.kapoor@email.com",
                email: "rohit.kapoor@email.com",
                pw: "Author@123",
              },
              {
                label: "Vikram Joshi",
                sub: "vikram.joshi@email.com",
                email: "vikram.joshi@email.com",
                pw: "Author@123",
              },
            ].map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email, d.pw)}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-slate-50 transition-colors border border-slate-100"
              >
                <span className="font-medium text-slate-900">
                  {d.label}
                </span>

                <span className="text-slate-400 ml-2 text-xs">
                  {d.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}