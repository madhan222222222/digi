import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, UserPlus } from "lucide-react";
import { apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { beginSession, homeForRole } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import type { MeResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/site/SiteLayout";
import { cn } from "@/lib/utils";

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetCategory = params.get("category");
  const [role, setRole] = useState<"candidate" | "employer">("candidate");
  const [agreed, setAgreed] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    category: CATEGORIES.some((c) => c.key === presetCategory) ? (presetCategory as string) : "fresher",
    current_location: "",
    skills: "",
    company_name: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiPost<MeResponse>("/auth/register", {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || null,
        role,
        category: form.category,
        current_location: form.current_location || null,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        company_name: role === "employer" ? form.company_name : null,
      }),
    onSuccess: (data) => {
      beginSession();
      toast.success("Account created — complete your profile next.");
      navigate(homeForRole(data.user.role), { replace: true });
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not create your account")),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const selectedCategory = CATEGORIES.find((c) => c.key === form.category);

  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      {/* Guidance panel */}
      <div className="hidden flex-col justify-between bg-hero p-10 text-hero-foreground lg:col-span-2 lg:flex">
        <Logo dark />
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Get started</p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight">
            Register once. Apply to every opening that fits.
          </h2>
          <div className="mt-6 space-y-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setRole("candidate");
                  setForm((f) => ({ ...f, category: c.key }));
                }}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-colors",
                  role === "candidate" && form.category === c.key
                    ? "border-teal-500/60 bg-teal-600/15"
                    : "border-hero-border bg-hero-card hover:border-teal-500/40",
                )}
                data-testid={`register-track-${c.slug}`}
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-teal-300">{c.badge}</span>
                <span className="mt-0.5 block font-heading text-sm font-bold text-white">{c.label}</span>
                <span className="mt-0.5 block text-xs text-hero-muted">{c.tagline}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-hero-muted">
          Registering is free. No fee applies for registering, uploading a resume, applying for a job, or receiving an
          offer letter.
        </p>
      </div>

      {/* Form */}
      <div className="flex items-start justify-center p-6 lg:col-span-3 lg:p-12">
        <Card className="w-full max-w-xl p-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-tight text-slate-900 lg:mt-0" data-testid="register-headline">
            Create your account
          </h1>

          <Tabs value={role} onValueChange={(v) => setRole(v as "candidate" | "employer")} className="mt-5">
            <TabsList className="w-full" data-testid="register-role-tabs">
              <TabsTrigger value="candidate" className="flex-1" data-testid="register-role-candidate">
                <UserPlus className="h-4 w-4" /> Candidate
              </TabsTrigger>
              <TabsTrigger value="employer" className="flex-1" data-testid="register-role-employer">
                <Building2 className="h-4 w-4" /> Employer
              </TabsTrigger>
            </TabsList>

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
                  <Label htmlFor="register-email">Email *</Label>
                  <Input id="register-email" type="email" required autoComplete="email" data-testid="register-email-input" {...field("email")} />
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

              <TabsContent value="candidate" className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Candidate category *</Label>
                  <Select value={form.category} onValueChange={(v: string) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger data-testid="register-category-select">
                      <SelectValue>
                        {(v: string) => CATEGORIES.find((c) => c.key === v)?.label ?? "Select"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCategory && (
                    <p className="text-xs text-slate-500">
                      {selectedCategory.profileFieldsNote} You can change your category later without losing your
                      history.
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="register-location">Current location</Label>
                    <Input id="register-location" placeholder="e.g. Bengaluru" data-testid="register-location-input" {...field("current_location")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="register-skills">Skills (comma separated)</Label>
                    <Input id="register-skills" placeholder="Python, SQL, React" data-testid="register-skills-input" {...field("skills")} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employer" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="register-company">Company name *</Label>
                  <Input
                    id="register-company"
                    required={role === "employer"}
                    data-testid="register-company-input"
                    {...field("company_name")}
                  />
                  <p className="text-xs text-slate-500">
                    An employer account lets you submit and update your own job listings. Every listing is reviewed
                    before it goes public.
                  </p>
                </div>
              </TabsContent>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} data-testid="register-terms-checkbox" />
                <span className="text-xs leading-relaxed text-slate-600">
                  I agree to the <Link to="/terms" className="font-semibold text-teal-700 underline">Terms &amp; Conditions</Link> and{" "}
                  <Link to="/privacy" className="font-semibold text-teal-700 underline">Privacy Policy</Link>. I understand
                  that no job offer is guaranteed and that any service fee applies only under a separate agreement I
                  accept explicitly.
                </span>
              </label>

              <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="register-submit-btn">
                {mutation.isPending ? "Creating account…" : `Create ${role} account`}
              </Button>
            </form>
          </Tabs>

          <p className="mt-5 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-teal-700 hover:underline" data-testid="register-login-link">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
