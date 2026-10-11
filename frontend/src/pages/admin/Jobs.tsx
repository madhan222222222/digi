import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Briefcase, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { JOB_STATUS_LABELS, WORK_MODE_LABELS, expText, formatDate, salaryText } from "@/lib/format";
import type { Job, Paginated, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";

const STATUSES = ["pending", "approved", "rejected", "paused", "closed", "archived"];

function AssignDialog({ job }: { job: Job }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["admin-users", "employee"],
    queryFn: () => apiGet<{ items: UserOut[] }>("/admin/users?role=employee"),
    enabled: open,
    retry: false,
  });

  const mut = useMutation({
    mutationFn: () => apiPost("/admin/assignments", { employee_id: employeeId, assignment_type: "job", target_id: job.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      toast.success("Job assigned to the employee");
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not assign this job")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        data-testid={`admin-job-assign-btn-${job.id}`}
      >
        Assign
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to an employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={employeeId} onValueChange={(v: string) => setEmployeeId(v)}>
            <SelectTrigger data-testid={`admin-job-assign-select-${job.id}`}>
              <SelectValue>
                {(v: string) => employees?.items.find((e) => e.id === v)?.full_name ?? "Select an employee"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(employees?.items ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" disabled={!employeeId || mut.isPending} onClick={() => mut.mutate()} data-testid={`admin-job-assign-save-${job.id}`}>
            Assign job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModerateDialog({ job }: { job: Job }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(job.status === "pending" ? "approved" : job.status);
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () => apiPost(`/admin/jobs/${job.id}/moderate`, { status, notes: notes || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(`Job ${status}`);
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not update this job")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700"
        data-testid={`admin-job-moderate-btn-${job.id}`}
      >
        Review / moderate
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Moderate: {job.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p><strong>{job.company_name}</strong>{job.company_website ? ` · ${job.company_website}` : ""}</p>
            <p className="mt-1">Recruiter: {job.recruiter_name || "—"} · {job.recruiter_email || "—"} · {job.recruiter_phone || "—"}</p>
            <p className="mt-1">{job.location || "—"} · {WORK_MODE_LABELS[job.work_mode]} · {expText(job.min_experience, job.max_experience)} · {salaryText(job)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Decision</Label>
            <Select value={status} onValueChange={(v: string) => setStatus(v)}>
              <SelectTrigger data-testid={`admin-job-status-select-${job.id}`}>
                <SelectValue>{(v: string) => JOB_STATUS_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["approved", "rejected", "paused", "closed", "archived"].map((s) => (
                  <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`mod-notes-${job.id}`}>Reviewer notes / requested corrections</Label>
            <Textarea id={`mod-notes-${job.id}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid={`admin-job-notes-${job.id}`} />
          </div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending} data-testid={`admin-job-moderate-save-${job.id}`}>
            {mut.isPending ? "Saving…" : "Record decision"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminJobs() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const status = params.get("status") ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-jobs", params.toString()],
    queryFn: () => apiGet<Paginated<Job>>(`/admin/jobs?${params.toString()}`),
    retry: false,
  });

  const verify = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      apiPost(`/admin/jobs/${id}/verify`, { verification_status: value, notes: "Employer and vacancy checks recorded" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      toast.success("Verification status updated");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-jobs-headline">
          Jobs &amp; approvals
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Only approved listings appear publicly. Mark a job verified only after completing your employer and vacancy
          checks.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <form
          className="flex min-w-64 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setFilter("q", String(fd.get("q") ?? ""));
          }}
        >
          <Input name="q" defaultValue={q} placeholder="Search by title or company…" data-testid="admin-jobs-search-input" />
          <Button type="submit" data-testid="admin-jobs-search-btn">Search</Button>
        </form>
        <Select value={status || "all"} onValueChange={(v: string) => setFilter("status", v)}>
          <SelectTrigger className="w-48" data-testid="admin-jobs-status-filter">
            <SelectValue>{(v: string) => (v === "all" ? "All statuses" : JOB_STATUS_LABELS[v] ?? v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No job submissions"
          description="Employer submissions appear here for review as soon as they arrive."
          testId="admin-jobs-empty"
        />
      )}

      <div className="space-y-4">
        {data?.items.map((job) => (
          <Card key={job.id} className="p-6" data-testid={`admin-job-row-${job.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-base font-bold text-slate-900">{job.title}</p>
                <p className="text-sm text-slate-600">
                  {job.company_name} · {job.location || "—"} · {expText(job.min_experience, job.max_experience)}
                </p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  Submitted {formatDate(job.posted_at)}
                  {job.submission_email ? ` · ${job.submission_email}` : ""}
                  {job.application_deadline ? ` · deadline ${formatDate(job.application_deadline)}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={job.status} label={JOB_STATUS_LABELS[job.status]} testId={`admin-job-status-${job.id}`} />
                <StatusBadge status={job.verification_status} />
              </div>
            </div>
            {job.review_notes && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Notes: {job.review_notes}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ModerateDialog job={job} />
              <AssignDialog job={job} />
              <Button
                variant="outline"
                size="xs"
                onClick={() => verify.mutate({ id: job.id, value: job.verification_status === "verified" ? "unverified" : "verified" })}
                data-testid={`admin-job-verify-btn-${job.id}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {job.verification_status === "verified" ? "Remove verified status" : "Mark verified (checks done)"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {data && <Pagination page={page} pages={data.pages} onPage={(p) => setFilter("page", String(p))} />}
    </div>
  );
}
