import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, ShieldCheck } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { beginSession, homeForRole } from "@/lib/session";
import type { MeResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/SiteLayout";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const mutation = useMutation({
    mutationFn: () => apiPost<MeResponse>("/auth/login", form),
    onSuccess: (data) => {
      beginSession();
      toast.success(`Welcome back, ${data.user.full_name}`);
      navigate(homeForRole(data.user.role), { replace: true });
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not sign in")),
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between bg-hero p-10 text-hero-foreground lg:flex">
        <Logo dark />
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Secure access</p>
          <h2 className="mt-3 max-w-md font-heading text-3xl font-extrabold tracking-tight">
            One account. Your applications, interviews and offers in one place.
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-hero-muted">
            {[
              "Sessions are httpOnly cookies — no tokens stored in your browser.",
              "Resumes, offer letters and identity documents stay private.",
              "Official application stages are updated only by authorised staff.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-hero-muted">
          DigiPhonics Technology — recruitment &amp; career placement. Not a training institute.
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-tight text-slate-900 lg:mt-0" data-testid="login-headline">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Candidates, employers and staff all sign in here — your portal is selected automatically.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            data-testid="login-form"
          >
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                data-testid="login-password-input"
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="login-submit-btn">
              <Lock className="h-4 w-4" /> {mutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-600">
            New here?{" "}
            <Link to="/register" className="font-semibold text-amber-800 hover:underline" data-testid="login-register-link">
              Create a candidate or employer account
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            Admin and employee accounts are created by DigiPhonics staff only.
          </p>
        </Card>
      </div>
    </div>
  );
}
