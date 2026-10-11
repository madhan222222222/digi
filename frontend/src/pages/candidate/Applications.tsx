import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { apiGet } from "@/lib/api";
import { APPLICATION_STATUS_LABELS, formatDate, formatDateTime } from "@/lib/format";
import type { ApplicationRow, Interview, Paginated } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StageRail } from "@/components/StageRail";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

function ApplicationRowCard({ app }: { app: ApplicationRow }) {
  const { data: interviews } = useQuery({
    queryKey: ["interviews", app.id],
    queryFn: () => apiGet<Interview[]>(`/applications/${app.id}/interviews`),
    retry: false,
  });

  return (
    <Card className="p-6" data-testid={`application-card-${app.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/jobs/${app.job_id}`} className="font-heading text-base font-bold text-slate-900 hover:text-amber-800">
            {app.job_title}
          </Link>
          <p className="text-sm text-slate-600">{app.company_name}</p>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
            Applied {formatDate(app.created_at)}
          </p>
        </div>
        <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status]} testId={`application-status-${app.id}`} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <StageRail current={app.status} testPrefix={`application-rail-${app.id}`} />
      </div>

      {(interviews?.length ?? 0) > 0 && (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4" data-testid={`application-interviews-${app.id}`}>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-900">Interviews</p>
          {interviews?.map((iv) => (
            <div key={iv.id} className="mt-2 text-xs text-amber-950">
              <p className="font-semibold">{formatDateTime(iv.scheduled_at)} ({iv.timezone})</p>
              <p>
                {iv.interview_type}
                {iv.interviewer_name ? ` · ${iv.interviewer_name}` : ""}
                {iv.interviewer_designation ? `, ${iv.interviewer_designation}` : ""}
              </p>
              {iv.meeting_link && (
                <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                  Join meeting
                </a>
              )}
              {iv.venue && <p>Venue: {iv.venue}</p>}
            </div>
          ))}
        </div>
      )}

      {app.status_history.length > 0 && (
        <details className="mt-4" data-testid={`application-history-${app.id}`}>
          <summary className="cursor-pointer text-xs font-semibold text-amber-800">
            Status history ({app.status_history.length})
          </summary>
          <ol className="mt-3 space-y-2 border-l border-slate-200 pl-4">
            {[...app.status_history].reverse().map((ev, i) => (
              <li key={i} className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{APPLICATION_STATUS_LABELS[ev.status] ?? ev.status}</span>
                {" · "}
                {formatDateTime(ev.changed_at)}
                {ev.changed_by_name ? ` · by ${ev.changed_by_name}` : ""}
                {ev.note && <span className="mt-0.5 block text-slate-500">{ev.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </Card>
  );
}

export default function CandidateApplications() {
  const { data, isLoading } = useQuery({
    queryKey: ["applications", "mine"],
    queryFn: () => apiGet<Paginated<ApplicationRow>>("/applications?limit=100"),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="applications-headline">
          My applications
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Official stages are updated by DigiPhonics staff. You are notified of every meaningful change.
        </p>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="Apply to an opening and its full progress timeline appears here."
          action={
            <Link to="/jobs" className={buttonVariants({ size: "sm" })} data-testid="applications-browse-btn">
              Browse openings
            </Link>
          }
          testId="applications-empty-state"
        />
      )}
      <div className="space-y-5">
        {data?.items.map((app) => (
          <ApplicationRowCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
