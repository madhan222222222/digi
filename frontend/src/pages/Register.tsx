import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, UserPlus } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { beginSession } from "@/lib/session";
import type { MeResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/site/SiteLayout";

const STEPS = [
  "Register your staff account",
  "Submit personal details (name, father's & mother's name, DOB, address)",
  "Upload Aadhaar, PAN and education certificates",
  "Admin verifies and approves — your portal, ID card and attendance unlock",
];

export default function Register() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });

  const mutation = useMutation({
    mutationFn: () =>
      apiPost<MeResponse>("/auth/register", {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || null,
        role: "employee",
      }),
    onSuccess: () => {
      beginSession();
      toast.success("Account created — complete onboarding for admin approval.");
      navigate("/employee/onboarding", { replace: true });
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not create your account")),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      <div className="hidden flex-col justify-between bg-hero p-10 text-hero-foreground lg:col-span-2 lg:flex">
        <Logo dark />
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Staff onboarding</p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight">
            Employee access is granted only after admin approval.
          </h2>
          <ol className="mt-6 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-3 rounded-xl border border-hero-border bg-hero-card p-3 text-sm">
                <span className="font-mono text-xs font-bold text-amber-400">0{i + 1}</span>
                <span className="text-hero-muted">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs leading-relaxed text-hero-muted">
          DigiPhonics Technology — only admin and employee accounts exist on this platform. Admin accounts are never
          created through public registration.
        </p>
      </div>

      <div className="flex items-start justify-center p-6 lg:col-span-3 lg:p-12">
        <Card className="w-full max-w-xl p-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1
            className="mt-4 font-heading text-2xl font-extrabold tracking-tight text-slate-900 lg:mt-0"
            data-testid="register-headline"
          >
            Employee registration
          </h1>
          <p className="mt-1 text-sm text-slate-600" data-testid="register-subtitle">
            Register as a DigiPhonics employee. You will be able to sign in immediately, but only to complete
            onboarding — the portal opens once an admin approves your documents.
          </p>

          <form
            className="mt-6 space-y-4"
            data-testid="register-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!agreed) {
                toast.error("Please accept the Terms and Privacy Policy to continue.");
                return;
              }
              mutation.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="register-name">Full name *</Label>
                <Input id="register-name" required data-testid="register-name-input" {...field("full_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="register-email">Work email *</Label>
                <Input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  data-testid="register-email-input"
                  {...field("email")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="register-phone">Phone</Label>
                <Input id="register-phone" data-testid="register-phone-input" {...field("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="register-password">Password * (min 8 characters)</Label>
                <Input
                  id="register-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  data-testid="register-password-input"
                  {...field("password")}
                />
              </div>
            </div>

            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3" data-testid="register-approval-note">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p className="text-xs leading-relaxed text-amber-900">
                Your account stays in <strong>pending approval</strong> until an admin verifies your onboarding
                submission. Identity documents are stored privately and are visible only to admins.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} data-testid="register-terms-checkbox" />
              <span className="text-xs leading-relaxed text-slate-600">
                I agree to the{" "}
                <Link to="/terms" className="font-semibold text-amber-800 underline">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="font-semibold text-amber-800 underline">
                  Privacy Policy
                </Link>
                , and I consent to DigiPhonics verifying the documents I submit.
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="register-submit-btn">
              <UserPlus className="h-4 w-4" />
              {mutation.isPending ? "Creating account…" : "Create employee account"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-amber-800 hover:underline" data-testid="register-login-link">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
