import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, Building2, MapPin, ShieldCheck } from "lucide-react";
import { apiDelete, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { useMe } from "@/lib/session";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  WORK_MODE_LABELS,
  expText,
  formatDate,
  isDeadlinePassed,
  salaryText,
} from "@/lib/format";
import { categoryByKey } from "@/lib/constants";
import type { Job } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";

export function JobCard({
  job,
  saved,
  showManage = false,
}: {
  job: Job;
  saved?: boolean;
  showManage?: boolean;
}) {
  const { data: me } = useMe();
  const isCandidate = me?.user?.role === "candidate";
  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async () =>
      saved ? apiDelete(`/jobs/${job.id}/save`) : apiPost(`/jobs/${job.id}/save`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(saved ? "Removed from saved jobs" : "Job saved to your profile");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not update saved jobs")),
  });

  return (
    <Card
      size="sm"
      className="group flex h-full flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      data-testid={`job-card-${job.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{job.company_name}</span>
            {job.verification_status === "verified" && (
              <span
                className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-teal-700"
                title="Reviewed by DigiPhonics — employer and vacancy checks completed"
                data-testid="job-verified-badge"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </p>
          <h3 className="mt-1 truncate font-heading text-base font-bold text-slate-900">
            <Link to={`/jobs/${job.id}`} className="hover:text-teal-700" data-testid={`job-card-title-${job.id}`}>
              {job.title}
            </Link>
          </h3>
        </div>
        {isCandidate && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={saved ? "Remove from saved" : "Save job"}
            onClick={() => saveMut.mutate()}
            data-testid={`job-card-save-btn-${job.id}`}
          >
            <Bookmark className={`h-4 w-4 ${saved ? "fill-teal-600 text-teal-600" : "text-slate-400"}`} />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-slate-400" /> {job.location || "—"}
        </span>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {WORK_MODE_LABELS[job.work_mode] ?? job.work_mode}
        </Badge>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 font-mono text-[11px] text-slate-600">
        <span className="rounded bg-slate-100 px-2 py-0.5">{expText(job.min_experience, job.max_experience)}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5">{salaryText(job)}</span>
        {job.candidate_categories.slice(0, 2).map((c) => {
          const meta = categoryByKey(c);
          return (
            <span key={c} className={`rounded border px-2 py-0.5 ${meta?.chipClass ?? "bg-slate-100"}`}>
              {meta?.label ?? c}
            </span>
          );
        })}
      </div>

      {job.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.required_skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
              {s}
            </span>
          ))}
          {job.required_skills.length > 4 && (
            <span className="px-1 py-0.5 text-[11px] text-slate-400">+{job.required_skills.length - 4} more</span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <span className={`font-mono text-[11px] ${job.application_deadline && isDeadlinePassed(job.application_deadline) ? "text-red-600" : "text-slate-500"}`}>
          {job.application_deadline ? `Apply by ${formatDate(job.application_deadline)}` : "Open until filled"}
        </span>
        <div className="flex items-center gap-2">
          {showManage && <StatusBadge status={job.status} label={JOB_STATUS_LABELS[job.status] ?? job.status} />}
          <Link
            to={`/jobs/${job.id}`}
            className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
            data-testid={`job-card-view-btn-${job.id}`}
          >
            View & Apply
          </Link>
        </div>
      </div>
    </Card>
  );
}
