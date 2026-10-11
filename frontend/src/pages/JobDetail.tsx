import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
  Send,
  Users,
} from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { useMe } from "@/lib/session";
import {
  APPLICATION_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  expText,
  formatDate,
  isDeadlinePassed,
  salaryText,
} from "@/lib/format";
import { categoryByKey } from "@/lib/constants";
import type { ApplicationRow, Job, Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default function JobDetail() {
  const { jobId } = useParams();
  const { data: me } = useMe();
  const user = me?.user;
  const qc = useQueryClient();
  const [coverNote, setCoverNote] = useState("");
  const [justApplied, setJustApplied] = useState(false);

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => apiGet<Job>(`/jobs/${jobId}`),
    retry: false,
    enabled: !!jobId,
  });

  const isCandidate = user?.role === "candidate";
  const { data: myApps } = useQuery({
    queryKey: ["applications", "mine"],
    queryFn: () => apiGet<Paginated<ApplicationRow>>("/applications?limit=100"),
    enabled: !!isCandidate,
    retry: false,
  });
  const existing = (myApps?.items ?? []).find(
    (a) => a.job_id === jobId && !["closed", "not_selected"].includes(a.status),
  );

  const { data: savedJobs } = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: () => apiGet<Job[]>("/jobs/saved"),
    enabled: !!isCandidate,
    retry: false,
  });
  const isSaved = (savedJobs ?? []).some((j) => j.id === jobId);

  const applyMut = useMutation({
    mutationFn: () => apiPost(`/jobs/${jobId}/apply`, { cover_note: coverNote || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Application submitted — track it in your dashboard.");
      setJustApplied(true);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not submit application")),
  });

  const saveMut = useMutation({
    mutationFn: async () => (isSaved ? apiDelete(`/jobs/${jobId}/save`) : apiPost(`/jobs/${jobId}/save`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      toast.success(isSaved ? "Removed from saved jobs" : "Job saved");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }
  if (isError || !job) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Job not found"
          description="This opening may have been closed, expired, or removed."
          action={
            <Link to="/jobs" className="inline-flex h-10 items-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white">
              Browse all openings
            </Link>
          }
          testId="job-detail-not-found"
        />
      </div>
    );
  }

  const deadlinePassed = isDeadlinePassed(job.application_deadline);
  const canApply = isCandidate && job.status === "approved" && !deadlinePassed && !existing && !justApplied;
  const recruiterVisible = !!user && (user.role === "admin" || user.role === "employee");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900" data-testid="job-detail-back-link">
        <ArrowLeft className="h-4 w-4" /> All openings
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-12">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="p-6" data-testid="job-detail-header-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                {job.logo_file_id && (
                  <img
                    src={`/api/files/public/${job.logo_file_id}`}
                    alt={`${job.company_name} logo`}
                    className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                    data-testid="job-detail-logo"
                  />
                )}
                <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Building2 className="h-4 w-4 text-slate-400" /> {job.company_name}
                  {job.verification_status === "verified" && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      <BadgeCheck className="h-4 w-4" /> Verified opening
                    </span>
                  )}
                </p>
                <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl" data-testid="job-detail-title">
                  {job.title}
                </h1>
                </div>
              </div>
              {isCandidate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveMut.mutate()}
                  data-testid="job-detail-save-btn"
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? "fill-amber-700 text-amber-700" : ""}`} />
                  {isSaved ? "Saved" : "Save job"}
                </Button>
              )}
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3" data-testid="job-detail-meta">
              <p className="flex items-center gap-2 text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" /> {job.location || "—"}
              </p>
              <p className="flex items-center gap-2 text-slate-700">
                <Layers className="h-4 w-4 text-slate-400" /> {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
              </p>
              <p className="flex items-center gap-2 text-slate-700">
                <Clock className="h-4 w-4 text-slate-400" /> {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
              </p>
              <p className="flex items-center gap-2 text-slate-700">
                <Users className="h-4 w-4 text-slate-400" /> {expText(job.min_experience, job.max_experience)}
              </p>
              <p className="flex items-center gap-2 text-slate-700">
                <BadgeCheck className="h-4 w-4 text-slate-400" /> {salaryText(job)}
              </p>
              <p className={`flex items-center gap-2 ${deadlinePassed ? "text-red-600" : "text-slate-700"}`}>
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {job.application_deadline ? `Apply by ${formatDate(job.application_deadline)}` : "Open until filled"}
              </p>
            </div>

            {job.candidate_categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {job.candidate_categories.map((c) => {
                  const meta = categoryByKey(c);
                  return (
                    <span key={c} className={`rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${meta?.badgeClass ?? "bg-slate-100"}`}>
                      {meta?.label ?? c}
                    </span>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6" data-testid="job-detail-description">
            <h2 className="font-heading text-lg font-bold text-slate-900">Job description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{job.description}</p>

            {job.responsibilities.length > 0 && (
              <>
                <h3 className="mt-6 font-heading text-base font-bold text-slate-900">Responsibilities</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {job.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {job.required_skills.length > 0 && (
                <div>
                  <h3 className="font-heading text-base font-bold text-slate-900">Required skills</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.required_skills.map((s) => (
                      <span key={s} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.preferred_skills.length > 0 && (
                <div>
                  <h3 className="font-heading text-base font-bold text-slate-900">Preferred skills</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.preferred_skills.map((s) => (
                      <span key={s} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(job.eligibility || job.interview_rounds || job.vacancies != null) && (
              <dl className="mt-6 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm" data-testid="job-detail-criteria">
                {job.eligibility && (
                  <div>
                    <dt className="font-semibold text-slate-900">Eligibility</dt>
                    <dd className="text-slate-700">{job.eligibility}</dd>
                  </div>
                )}
                {job.interview_rounds && (
                  <div>
                    <dt className="font-semibold text-slate-900">Interview rounds</dt>
                    <dd className="text-slate-700">{job.interview_rounds}</dd>
                  </div>
                )}
                {job.vacancies != null && (
                  <div>
                    <dt className="font-semibold text-slate-900">Vacancies</dt>
                    <dd className="text-slate-700">{job.vacancies}</dd>
                  </div>
                )}
              </dl>
            )}
          </Card>

          <Card className="p-6" data-testid="job-detail-company-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">About {job.company_name}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {job.company_overview || "The employer has not provided a company overview."}
                </p>
              </div>
              {job.company_website && (
                <a
                  href={job.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-800 hover:underline"
                  data-testid="job-detail-website-link"
                >
                  <Globe className="h-4 w-4" /> Website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-slate-500">
              Source: {job.source === "employer_submission" ? "Direct employer submission" : job.source} ·{" "}
              <StatusBadge
                status={job.verification_status}
                label={job.verification_status === "verified" ? "Verified" : "Unverified"}
              />
            </p>
          </Card>
        </div>

        {/* Apply rail */}
        <div className="lg:col-span-4">
          <Card className="sticky top-20 p-6" data-testid="job-detail-apply-panel">
            <h2 className="font-heading text-lg font-bold text-slate-900">Apply for this role</h2>

            {!user && (
              <div className="mt-4 space-y-3" data-testid="job-detail-guest-apply">
                <p className="text-sm text-slate-600">Sign in as a candidate to apply and track this application.</p>
                <Link to="/login" className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-amber-700 text-sm font-semibold text-white hover:bg-amber-800" data-testid="job-detail-login-btn">
                  Login
                </Link>
                <Link to="/register" className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid="job-detail-register-btn">
                  Register as a candidate
                </Link>
              </div>
            )}

            {user && !isCandidate && (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600" data-testid="job-detail-staff-note">
                You are signed in as {user.role}. Applications are submitted from candidate accounts.{" "}
                {recruiterVisible && job.recruiter_email && (
                  <span className="mt-2 block rounded border border-slate-200 bg-white p-2 font-mono text-[11px]">
                    Recruiter: {job.recruiter_name ?? "—"} ({job.recruiter_designation ?? "—"}) · {job.recruiter_email}
                    {job.recruiter_phone ? ` · ${job.recruiter_phone}` : ""}
                  </span>
                )}
              </p>
            )}

            {isCandidate && (
              <>
                {existing && (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4" data-testid="job-detail-already-applied">
                    <p className="text-sm font-semibold text-amber-900">Application submitted</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Current stage: {APPLICATION_STATUS_LABELS[existing.status] ?? existing.status}. Track progress in
                      your dashboard.
                    </p>
                    <Link to="/dashboard/applications" className="mt-2 inline-block text-xs font-semibold text-amber-800 underline">
                      Go to applications
                    </Link>
                  </div>
                )}
                {justApplied && !existing && (
                  <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                    Application submitted — track it in your dashboard.
                  </p>
                )}
                {deadlinePassed && (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-testid="job-detail-deadline-passed">
                    The application deadline for this role has passed.
                  </p>
                )}
                {canApply && (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      rows={4}
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      placeholder="Optional note to the recruiter — why you fit this role"
                      data-testid="job-detail-cover-note"
                    />
                    <Button
                      className="w-full"
                      onClick={() => applyMut.mutate()}
                      disabled={applyMut.isPending}
                      data-testid="apply-job-submit-btn"
                    >
                      <Send className="h-4 w-4" /> {applyMut.isPending ? "Submitting…" : "Submit application"}
                    </Button>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Your profile resume is shared with this application. Applying is free — no fee applies for
                      applying or receiving an offer.
                    </p>
                  </div>
                )}
              </>
            )}

            {job.application_instructions && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Application instructions
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                  {job.application_instructions}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
