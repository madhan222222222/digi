import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Bookmark, Briefcase, CalendarClock, FileText, Target, Video } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import { APPLICATION_STATUS_LABELS, formatDateTime } from "@/lib/format";
import { categoryByKey } from "@/lib/constants";
import type { CandidateDashboard as Dash, Job } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { JobCard } from "@/components/JobCard";
import { StageRail } from "@/components/StageRail";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default function CandidateDashboard() {
  const { data: me } = useMe();
  const profile = me?.candidate_profile;
  const categoryMeta = categoryByKey(profile?.category);

  const { data: dash } = useQuery({
    queryKey: ["candidate-dashboard"],
    queryFn: () => apiGet<Dash>("/candidate/dashboard"),
    retry: false,
  });

  const { data: recommended } = useQuery({
    queryKey: ["recommended-jobs"],
    queryFn: () => apiGet<Job[]>("/candidate/recommended-jobs"),
    retry: false,
  });

  const completion = dash?.profile_completion ?? 0;
  const counts = dash?.counts;

  const tiles = [
    { label: "Applications", value: counts?.applications ?? 0, icon: FileText, to: "/dashboard/applications" },
    { label: "Saved jobs", value: counts?.saved_jobs ?? 0, icon: Bookmark, to: "/dashboard/saved" },
    { label: "Question bookmarks", value: counts?.bookmarks ?? 0, icon: Target, to: "/interview-questions" },
    { label: "Verified placements", value: counts?.verified_placements ?? 0, icon: BadgeCheck, to: "/dashboard/offers" },
  ];

  const latestStage = (() => {
    const byStatus = dash?.applications_by_status ?? {};
    const order = ["joined", "offer_received", "selected", "interview_completed", "interview_scheduled", "shortlisted", "under_review", "applied"];
    return order.find((s) => (byStatus[s] ?? 0) > 0) ?? null;
  })();

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          {categoryMeta?.label ?? "Candidate"} track
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="candidate-dashboard-headline">
          Welcome back, {me?.user?.full_name?.split(" ")[0] ?? "there"}
        </h1>
      </div>

      {/* Profile completion */}
      <Card className="p-6" data-testid="profile-completion-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-heading text-base font-bold text-slate-900">Profile completion</p>
            <p className="mt-1 text-sm text-slate-600">
              A complete profile gets shortlisted more often. {completion < 100 ? "Fill the remaining fields to improve your matches." : "Your profile is complete."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-heading text-3xl font-extrabold text-slate-900" data-testid="profile-completion-value">
              {completion}%
            </span>
            <Link to="/dashboard/profile" className={buttonVariants({ size: "sm" })} data-testid="dashboard-edit-profile-btn">
              Edit profile
            </Link>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-amber-700 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </Card>

      {/* Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-tiles">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} data-testid={`dashboard-tile-${t.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <Card className="h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <t.icon className="h-4 w-4 text-amber-800" />
              <p className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-slate-900">{t.value}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pipeline */}
      <Card className="p-6" data-testid="dashboard-pipeline-card">
        <p className="font-heading text-base font-bold text-slate-900">Your furthest application stage</p>
        <div className="mt-4 overflow-x-auto">
          <StageRail current={latestStage} testPrefix="dashboard-stage-rail" />
        </div>
        {!latestStage && (
          <p className="mt-3 text-sm text-slate-500">
            No applications yet.{" "}
            <Link to="/jobs" className="font-semibold text-amber-800 underline">
              Browse openings
            </Link>{" "}
            to get started.
          </p>
        )}
        {dash && Object.keys(dash.applications_by_status).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(dash.applications_by_status).map(([status, count]) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <StatusBadge status={status} label={`${APPLICATION_STATUS_LABELS[status] ?? status} · ${count}`} />
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Interviews */}
        <Card className="p-6 lg:col-span-5" data-testid="dashboard-interviews-card">
          <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
            <CalendarClock className="h-4 w-4 text-amber-800" /> Upcoming interviews
          </p>
          <div className="mt-4 space-y-3">
            {(dash?.upcoming_interviews.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500" data-testid="dashboard-no-interviews">
                No interviews scheduled. You will be notified here when one is set.
              </p>
            )}
            {dash?.upcoming_interviews.map((iv) => (
              <div key={iv.id} className="rounded-lg border border-slate-200 p-3" data-testid={`dashboard-interview-${iv.id}`}>
                <p className="text-sm font-semibold text-slate-900">{formatDateTime(iv.scheduled_at)}</p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                  {iv.interview_type} · {iv.timezone}
                  {iv.interviewer_name ? ` · ${iv.interviewer_name}` : ""}
                </p>
                {iv.meeting_link && (
                  <a
                    href={iv.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                    data-testid={`dashboard-interview-link-${iv.id}`}
                  >
                    <Video className="h-3.5 w-3.5" /> Join meeting
                  </a>
                )}
                {iv.venue && <p className="mt-1 text-xs text-slate-600">Venue: {iv.venue}</p>}
              </div>
            ))}
          </div>
        </Card>

        {/* Recommended */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between">
            <p className="font-heading text-base font-bold text-slate-900">Recommended openings</p>
            <Link to="/jobs" className="text-sm font-semibold text-amber-800 hover:underline" data-testid="dashboard-all-jobs-link">
              Browse all
            </Link>
          </div>
          <div className="mt-4 space-y-4" data-testid="dashboard-recommended-jobs">
            {(recommended?.length ?? 0) === 0 && (
              <EmptyState
                icon={Briefcase}
                title="No matches yet"
                description="Add skills and preferred roles to your profile — recommendations are generated from your profile details."
                action={
                  <Link to="/dashboard/profile" className={buttonVariants({ size: "sm" })}>
                    Complete profile
                  </Link>
                }
                testId="dashboard-recommended-empty"
              />
            )}
            {recommended?.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
