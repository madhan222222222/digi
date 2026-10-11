import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useMe } from "@/lib/session";

// Route guard: the backend enforces authorization on every protected API; this only
// keeps the UI honest about what to render.
export function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { data, isLoading, isError } = useMe();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" data-testid="auth-guard-loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
      </div>
    );
  }
  if (isError || !data?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(data.user.role)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center" data-testid="auth-guard-denied">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-red-600">403</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-slate-900">Not authorized</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account ({data.user.role}) does not have access to this area.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
