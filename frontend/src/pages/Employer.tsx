import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, ClipboardCheck, Info, Send, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { useMe } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import { EMPLOYMENT_TYPE_LABELS, JOB_STATUS_LABELS, WORK_MODE_LABELS, formatDate } from "@/lib/format";
import type { FileMeta, Job } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { FileUploadButton } from "@/components/FileUploadButton";
import { EmptyState } from "@/components/EmptyState";

const WORKFLOW = [
  "You submit company and vacancy details.",
  "We create a pending submission — nothing is public yet.",
  "Our team reviews the employer identity and the vacancy information.",
  "We request corrections or additional evidence if anything is unclear.",
  "We approve or reject the submission and record the decision.",
  "Only approved openings appear on the public job board.",
];

const EMPTY = {
  company_name: "",
  company_website: "",
  company_overview: "",
  recruiter_name: "",
  recruiter_designation: "",
  recruiter_email: "",
  recruiter_phone: "",
  title: "",
  description: "",
  responsibilities: "",
  required_skills: "",
  preferred_skills: "",
  min_experience: "0",
  max_experience: "",
  eligibility: "",
  location: "",
  work_mode: "onsite",
  employment_type: "full_time",
  salary_min: "",
  salary_max: "",
  vacancies: "",
  interview_rounds: "",
  application_deadline: "",
  application_instructions: "",
};

export default function Employer() {
  const { data: me } = useMe();
  const isEmployer = me?.user?.role === "employer";
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [categories, setCategories] = useState<string[]>([]);
  const [supportingFile, setSupportingFile] = useState<FileMeta | null>(null);
  const [logoFile, setLogoFile] = useState<FileMeta | null>(null);

  const { data: submissions } = useQuery({
    queryKey: ["employer-submissions"],
    queryFn: () => apiGet<Job[]>("/employer/submissions"),
    enabled: !!isEmployer,
    retry: false,
  });

  const list = (v: string) =>
    v
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const mutation = useMutation({
    mutationFn: () =>
      apiPost<Job>("/employer/submissions", {
        company_name: form.company_name,
        company_website: form.company_website || null,
        company_overview: form.company_overview || null,
        recruiter_name: form.recruiter_name || null,
        recruiter_designation: form.recruiter_designation || null,
        recruiter_email: form.recruiter_email || null,
        recruiter_phone: form.recruiter_phone || null,
        title: form.title,
        description: form.description,
        responsibilities: list(form.responsibilities),
        required_skills: list(form.required_skills),
        preferred_skills: list(form.preferred_skills),
        min_experience: parseFloat(form.min_experience) || 0,
        max_experience: form.max_experience ? parseFloat(form.max_experience) : null,
        eligibility: form.eligibility || null,
        candidate_categories: categories,
        location: form.location || null,
        work_mode: form.work_mode,
        employment_type: form.employment_type,
        salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
        salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
        salary_currency: "INR",
        vacancies: form.vacancies ? parseInt(form.vacancies, 10) : null,
        interview_rounds: form.interview_rounds || null,
        application_deadline: form.application_deadline || null,
        application_instructions: form.application_instructions || null,
        supporting_file_id: supportingFile?.id ?? null,
        logo_file_id: logoFile?.id ?? null,
      }),
    onSuccess: () => {
      toast.success("Submission received — our team will review it before publication.");
      setForm({ ...EMPTY });
      setCategories([]);
      setSupportingFile(null);
      setLogoFile(null);
      qc.invalidateQueries({ queryKey: ["employer-submissions"] });
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not submit your vacancy")),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div>
      <section className="bg-hero py-14 text-hero-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Employer / Post a job
          </p>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="employer-headline">
            Submit your vacancy. We review before it goes live.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-hero-muted">
            Tell us about the company, the role and the candidate profile you need. Nothing is published until our
            team completes its review.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Form */}
          <div className="lg:col-span-8">
            <Card className="p-6">
              <h2 className="font-heading text-xl font-bold text-slate-900">Vacancy submission</h2>
              <form
                className="mt-6 space-y-6"
                data-testid="employer-job-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                {/* Company block */}
                <fieldset className="space-y-4">
                  <legend className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-800">
                    Company
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-company">Company name *</Label>
                      <Input id="emp-company" required data-testid="employer-company-input" {...field("company_name")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-website">Official website</Label>
                      <Input id="emp-website" placeholder="https://" data-testid="employer-website-input" {...field("company_website")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-overview">Company description</Label>
                    <Textarea id="emp-overview" rows={3} data-testid="employer-overview-input" {...field("company_overview")} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-recruiter">Recruiter name</Label>
                      <Input id="emp-recruiter" data-testid="employer-recruiter-input" {...field("recruiter_name")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-designation">Recruiter designation</Label>
                      <Input id="emp-designation" data-testid="employer-designation-input" {...field("recruiter_designation")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-bizemail">Business email *</Label>
                      <Input id="emp-bizemail" type="email" required data-testid="employer-email-input" {...field("recruiter_email")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-phone">Recruiter phone</Label>
                      <Input id="emp-phone" data-testid="employer-phone-input" {...field("recruiter_phone")} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Recruiter contact details are never shown publicly — only authorised DigiPhonics staff can see
                    them.
                  </p>
                </fieldset>

                {/* Role block */}
                <fieldset className="space-y-4 border-t border-slate-100 pt-6">
                  <legend className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-800">
                    The role
                  </legend>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-title">Job title *</Label>
                    <Input id="emp-title" required data-testid="employer-title-input" {...field("title")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-desc">Job description *</Label>
                    <Textarea id="emp-desc" rows={5} required data-testid="employer-description-input" {...field("description")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-resp">Responsibilities (one per line)</Label>
                    <Textarea id="emp-resp" rows={3} data-testid="employer-responsibilities-input" {...field("responsibilities")} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-skills">Required skills (comma separated) *</Label>
                      <Input id="emp-skills" required placeholder="Python, SQL, REST" data-testid="employer-skills-input" {...field("required_skills")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-pref-skills">Preferred skills</Label>
                      <Input id="emp-pref-skills" data-testid="employer-preferred-skills-input" {...field("preferred_skills")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-minexp">Minimum experience (years) *</Label>
                      <Input id="emp-minexp" type="number" min="0" step="0.5" required data-testid="employer-min-exp-input" {...field("min_experience")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-maxexp">Maximum experience (years)</Label>
                      <Input id="emp-maxexp" type="number" min="0" step="0.5" data-testid="employer-max-exp-input" {...field("max_experience")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-eligibility">Eligibility criteria</Label>
                    <Textarea id="emp-eligibility" rows={2} data-testid="employer-eligibility-input" {...field("eligibility")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Candidate categories accepted</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CATEGORIES.map((c) => (
                        <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                          <Checkbox
                            checked={categories.includes(c.key)}
                            onCheckedChange={(v) =>
                              setCategories((prev) => (v ? [...prev, c.key] : prev.filter((k) => k !== c.key)))
                            }
                            data-testid={`employer-category-${c.slug}`}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </fieldset>

                {/* Logistics */}
                <fieldset className="space-y-4 border-t border-slate-100 pt-6">
                  <legend className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-800">
                    Location, compensation &amp; timeline
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-location">Job location</Label>
                      <Input id="emp-location" placeholder="e.g. Pune" data-testid="employer-location-input" {...field("location")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Work mode</Label>
                      <Select value={form.work_mode} onValueChange={(v: string) => setForm((f) => ({ ...f, work_mode: v }))}>
                        <SelectTrigger data-testid="employer-work-mode-select">
                          <SelectValue>{(v: string) => WORK_MODE_LABELS[v]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(WORK_MODE_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Employment type</Label>
                      <Select value={form.employment_type} onValueChange={(v: string) => setForm((f) => ({ ...f, employment_type: v }))}>
                        <SelectTrigger data-testid="employer-employment-type-select">
                          <SelectValue>{(v: string) => EMPLOYMENT_TYPE_LABELS[v]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-vacancies">Number of vacancies</Label>
                      <Input id="emp-vacancies" type="number" min="1" data-testid="employer-vacancies-input" {...field("vacancies")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-salmin">Salary from (₹ per year)</Label>
                      <Input id="emp-salmin" type="number" min="0" data-testid="employer-salary-min-input" {...field("salary_min")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-salmax">Salary to (₹ per year)</Label>
                      <Input id="emp-salmax" type="number" min="0" data-testid="employer-salary-max-input" {...field("salary_max")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-rounds">Interview rounds</Label>
                      <Input id="emp-rounds" placeholder="e.g. 2 technical + 1 HR" data-testid="employer-rounds-input" {...field("interview_rounds")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-deadline">Application deadline</Label>
                      <Input id="emp-deadline" type="date" data-testid="employer-deadline-input" {...field("application_deadline")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-instructions">Application instructions</Label>
                    <Textarea id="emp-instructions" rows={2} data-testid="employer-instructions-input" {...field("application_instructions")} />
                  </div>
                  {me?.user && (
                    <div className="space-y-1.5">
                      <Label>Company logo (optional)</Label>
                      <div className="flex flex-wrap items-center gap-3">
                        <FileUploadButton category="logo" onUploaded={setLogoFile} testId="employer-logo-upload-btn">
                          Upload logo
                        </FileUploadButton>
                        {logoFile && (
                          <>
                            <img
                              src={`/api/files/public/${logoFile.id}`}
                              alt="Uploaded logo preview"
                              className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-1"
                              data-testid="employer-logo-preview"
                            />
                            <span className="font-mono text-xs text-amber-800">{logoFile.original_name}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        PNG, JPG or WebP up to 5 MB. Your logo appears on the public job card once the listing is
                        approved.
                      </p>
                    </div>
                  )}
                  {me?.user && (
                    <div className="space-y-1.5">
                      <Label>Supporting document (optional)</Label>
                      <div className="flex items-center gap-3">
                        <FileUploadButton category="supporting" onUploaded={setSupportingFile} testId="employer-supporting-upload-btn">
                          Upload document
                        </FileUploadButton>
                        {supportingFile && (
                          <span className="font-mono text-xs text-slate-600" data-testid="employer-supporting-file-name">
                            {supportingFile.original_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Sign-in required for uploads. A document alone does not make a company verified.
                      </p>
                    </div>
                  )}
                </fieldset>

                <Button type="submit" disabled={mutation.isPending} data-testid="employer-submit-btn">
                  <Send className="h-4 w-4" /> {mutation.isPending ? "Submitting…" : "Submit vacancy for review"}
                </Button>
              </form>
            </Card>

            {/* Employer's own submissions */}
            {isEmployer && (
              <Card className="mt-6 p-6" data-testid="employer-submissions-panel">
                <h2 className="font-heading text-xl font-bold text-slate-900">My job submissions</h2>
                <div className="mt-4 space-y-3">
                  {(submissions?.length ?? 0) === 0 && (
                    <EmptyState
                      icon={Briefcase}
                      title="No submissions yet"
                      description="Your submitted vacancies and their review status will appear here."
                      testId="employer-submissions-empty"
                    />
                  )}
                  {submissions?.map((job) => (
                    <div key={job.id} className="rounded-lg border border-slate-200 p-4" data-testid={`employer-submission-${job.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-heading text-sm font-bold text-slate-900">{job.title}</p>
                          <p className="text-xs text-slate-500">
                            {job.company_name} · submitted {formatDate(job.posted_at)}
                          </p>
                        </div>
                        <StatusBadge status={job.status} label={JOB_STATUS_LABELS[job.status]} />
                      </div>
                      {job.review_notes && (
                        <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                          Reviewer notes: {job.review_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Workflow rail */}
          <div className="space-y-5 lg:col-span-4">
            <Card className="p-6" data-testid="employer-workflow-card">
              <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
                <ClipboardCheck className="h-4 w-4 text-amber-800" /> Our review workflow
              </p>
              <ol className="mt-4 space-y-3">
                {WORKFLOW.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-700/10 font-mono text-[11px] font-bold text-amber-800">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
            <Card className="p-6">
              <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-amber-800" /> On verification
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We mark a listing "verified" only after completing our employer and vacancy checks. Supplying a
                website or uploading a document does not by itself make a company verified.
              </p>
            </Card>
            <Card className="p-6">
              <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
                <Info className="h-4 w-4 text-amber-800" /> Employer accounts
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Register an employer account to track and update your own listings. Editing a published listing sends
                it back for a quick re-review.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
