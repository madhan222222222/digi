import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, FileText, UserCheck } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { AdminEmployeeRow, DownloadLink } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const STATUS_TONES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

const FILTERS = [
  { key: "all", label: "All employees" },
  { key: "submitted", label: "Awaiting approval" },
  { key: "pending", label: "Onboarding incomplete" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Returned" },
];

function openFile(fileId: string) {
  apiPost<DownloadLink>(`/files/${fileId}/download-link`)
    .then((link) => window.open(link.url, "_blank"))
    .catch((err) => toast.error(apiErrorText(err, "Could not open the document")));
}

function ReviewDialog({ row }: { row: AdminEmployeeRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const p = row.profile;
  const [designation, setDesignation] = useState(p?.designation ?? "");
  const [department, setDepartment] = useState(p?.department ?? "Recruitment");
  const [days, setDays] = useState<string[]>(p?.working_days?.length ? p.working_days : ["mon", "tue", "wed", "thu", "fri"]);
  const [note, setNote] = useState("");

  const decide = useMutation({
    mutationFn: (status: string) =>
      apiPut(`/admin/employees/${row.user.id}/verification`, {
        status,
        designation: designation || null,
        department: department || null,
        working_days: days,
        review_note: note || null,
      }),
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success(status === "approved" ? "Employee approved — portal unlocked." : "Decision recorded.");
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not record the decision")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        data-testid={`admin-employee-review-btn-${row.user.id}`}
      >
        Review
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review {row.user.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 rounded-xl border border-slate-200 p-4 text-sm" data-testid={`admin-employee-details-${row.user.id}`}>
            <p><span className="text-slate-500">Email:</span> {row.user.email}</p>
            <p><span className="text-slate-500">Phone:</span> {row.user.phone ?? "—"}</p>
            <p><span className="text-slate-500">Father's name:</span> {p?.father_name ?? "—"}</p>
            <p><span className="text-slate-500">Mother's name:</span> {p?.mother_name ?? "—"}</p>
            <p><span className="text-slate-500">Date of birth:</span> {p?.date_of_birth ?? "—"}</p>
            <p><span className="text-slate-500">Address:</span> {p?.address ?? "—"}</p>
            <p><span className="text-slate-500">Emergency contact:</span> {p?.emergency_contact ?? "—"}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Submitted documents</p>
            <div className="mt-2 space-y-2">
              {(p?.documents ?? []).length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
              {(p?.documents ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <span className="text-sm text-slate-700">{d.label ?? d.doc_type}</span>
                  <Button variant="outline" size="xs" onClick={() => openFile(d.file_id)} data-testid={`admin-employee-doc-open-${d.doc_type}`}>
                    <FileText className="h-3.5 w-3.5" /> Open
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`desig-${row.user.id}`}>Designation</Label>
              <Input id={`desig-${row.user.id}`} value={designation} onChange={(e) => setDesignation(e.target.value)} data-testid="admin-employee-designation-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`dept-${row.user.id}`}>Department</Label>
              <Input id={`dept-${row.user.id}`} value={department} onChange={(e) => setDepartment(e.target.value)} data-testid="admin-employee-department-input" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working days</Label>
            <div className="flex flex-wrap gap-3" data-testid="admin-employee-working-days">
              {DAYS.map((d) => (
                <label key={d.key} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700">
                  <Checkbox
                    checked={days.includes(d.key)}
                    onCheckedChange={(v) => setDays((prev) => (v ? [...prev, d.key] : prev.filter((x) => x !== d.key)))}
                    data-testid={`admin-employee-day-${d.key}`}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`note-${row.user.id}`}>Note to the employee (shown if returned)</Label>
            <Textarea id={`note-${row.user.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} data-testid="admin-employee-note-input" />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => decide.mutate("approved")} disabled={decide.isPending} data-testid="admin-employee-approve-btn">
              <BadgeCheck className="h-4 w-4" /> Approve
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => decide.mutate("rejected")} disabled={decide.isPending} data-testid="admin-employee-reject-btn">
              Return for correction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEmployees() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-employees", filter],
    queryFn: () => apiGet<{ items: AdminEmployeeRow[]; total: number }>(`/admin/employees${filter !== "all" ? `?status=${filter}` : ""}`),
    retry: false,
  });

  return (
    <div className="space-y-6" data-testid="admin-employees-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Staff</p>
          <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900">Employee approvals</h1>
          <p className="mt-1 text-sm text-slate-600">
            Employees register themselves, submit details and documents, and gain portal access only after you approve.
          </p>
        </div>
        <Select value={filter} onValueChange={(v: string) => setFilter(v)}>
          <SelectTrigger className="w-56" data-testid="admin-employees-filter">
            <SelectValue>{(v: string) => FILTERS.find((f) => f.key === v)?.label ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No employees in this view"
          description="New employee registrations appear here as soon as they sign up."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" data-testid="admin-employees-list">
          {data.items.map((row) => {
            const status = row.profile?.verification_status ?? "pending";
            return (
              <Card key={row.user.id} className="p-5" data-testid={`admin-employee-card-${row.user.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {row.profile?.photo_file_id ? (
                      <img src={`/api/files/public/${row.profile.photo_file_id}`} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 font-heading text-sm font-bold text-slate-500">
                        {row.user.full_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-heading text-base font-bold text-slate-900">{row.user.full_name}</p>
                      <p className="text-xs text-slate-500">{row.user.email}</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        {row.profile?.employee_code ?? "—"} · {row.profile?.designation ?? "designation pending"}
                      </p>
                    </div>
                  </div>
                  <Badge className={STATUS_TONES[status]} data-testid={`admin-employee-status-${row.user.id}`}>
                    {status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>
                    {row.profile?.documents?.length ?? 0} document(s) ·{" "}
                    {row.profile?.submitted_at ? `submitted ${formatDate(row.profile.submitted_at)}` : "not submitted"}
                  </span>
                  <ReviewDialog row={row} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
