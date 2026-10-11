import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Lock } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { APPLICATION_STATUS_LABELS, formatDate } from "@/lib/format";
import type { ApplicationRow, DownloadLink, Paginated, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { StageRail } from "@/components/StageRail";
import { EmptyState } from "@/components/EmptyState";

const STAGES = Object.keys(APPLICATION_STATUS_LABELS);

function StageDialog({ app }: { app: ApplicationRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () => apiPost(`/applications/${app.id}/status`, { status, note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Stage updated and the candidate was notified");
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not update the stage")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700"
        data-testid={`admin-app-stage-btn-${app.id}`}
      >
        Update stage
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update application stage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{app.job_title} · {app.candidate_name}</p>
          <div className="space-y-1.5">
            <Label>New stage</Label>
            <Select value={status} onValueChange={(v: string) => setStatus(v)}>
              <SelectTrigger data-testid={`admin-app-stage-select-${app.id}`}>
                <SelectValue>{(v: string) => APPLICATION_STATUS_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`an-${app.id}`}>Note to candidate</Label>
            <Textarea id={`an-${app.id}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-testid={`admin-app-note-${app.id}`} />
          </div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending} data-testid={`admin-app-stage-save-${app.id}`}>
            Save stage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignEmployeeDialog({ app }: { app: ApplicationRow }) {
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
    mutationFn: () =>
      apiPost("/admin/assignments", { employee_id: employeeId, assignment_type: "application", target_id: app.id }),
    onSuccess: () => {
      toast.success("Application assigned — the employee can now manage it");
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not assign this application")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        data-testid={`admin-app-assign-btn-${app.id}`}
      >
        Assign to employee
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign application</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={employeeId} onValueChange={(v: string) => setEmployeeId(v)}>
            <SelectTrigger data-testid={`admin-app-assign-select-${app.id}`}>
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
          <Button className="w-full" disabled={!employeeId || mut.isPending} onClick={() => mut.mutate()} data-testid={`admin-app-assign-save-${app.id}`}>
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminApplications() {
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications", status],
    queryFn: () => apiGet<Paginated<ApplicationRow>>(`/applications?limit=100${status !== "all" ? `&status=${status}` : ""}`),
    retry: false,
  });

  async function download(fileId: string) {
    try {
      const link = await apiPost<DownloadLink>(`/files/${fileId}/download-link`);
      window.open(link.url, "_blank");
    } catch (err) {
      toast.error(apiErrorText(err, "Could not open the document"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-applications-headline">
            Candidate applications
          </h1>
          <p className="mt-1 text-sm text-slate-600">Full pipeline across every opening. Stage changes notify the candidate.</p>
        </div>
        <Select value={status} onValueChange={(v: string) => setStatus(v)}>
          <SelectTrigger className="w-56" data-testid="admin-applications-status-filter">
            <SelectValue>{(v: string) => (v === "all" ? "All stages" : APPLICATION_STATUS_LABELS[v] ?? v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState icon={FileText} title="No applications" description="Candidate applications appear here as they are submitted." testId="admin-applications-empty" />
      )}

      <div className="space-y-4">
        {data?.items.map((app) => (
          <Card key={app.id} className="p-6" data-testid={`admin-application-row-${app.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-heading text-base font-bold text-slate-900">{app.job_title}</p>
                <p className="text-sm text-slate-600">{app.company_name}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                  {app.candidate_name} · {app.candidate_email} · applied {formatDate(app.created_at)}
                </p>
              </div>
              <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status]} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <StageRail current={app.status} testPrefix={`admin-rail-${app.id}`} />
            </div>
            {app.cover_note && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Cover note: {app.cover_note}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StageDialog app={app} />
              <AssignEmployeeDialog app={app} />
              {app.resume_file_id && (
                <Button variant="ghost" size="xs" onClick={() => download(app.resume_file_id!)} data-testid={`admin-app-resume-btn-${app.id}`}>
                  <Lock className="h-3.5 w-3.5" /> Open resume
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
