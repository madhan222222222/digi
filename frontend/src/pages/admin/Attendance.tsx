import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import type { AdminEmployeeRow, AttendanceRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";

const STATUSES = ["present", "half_day", "leave", "absent", "week_off"];
const LABELS: Record<string, string> = {
  present: "Present",
  half_day: "Half day",
  leave: "Leave",
  absent: "Absent",
  week_off: "Week off",
};
const TONES: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-800",
  half_day: "bg-amber-100 text-amber-900",
  leave: "bg-sky-100 text-sky-800",
  absent: "bg-red-100 text-red-700",
  week_off: "bg-slate-100 text-slate-700",
};

export default function AdminAttendance() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState("");
  const [form, setForm] = useState({ employee_id: "", date: "", status: "present", note: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-attendance", dateFilter],
    queryFn: () =>
      apiGet<{ items: AttendanceRow[]; total: number; today: string }>(
        `/attendance/admin${dateFilter ? `?date=${dateFilter}` : ""}`,
      ),
    retry: false,
  });
  const { data: employees } = useQuery({
    queryKey: ["admin-employees", "approved"],
    queryFn: () => apiGet<{ items: AdminEmployeeRow[]; total: number }>("/admin/employees?status=approved"),
    retry: false,
  });

  const save = useMutation({
    mutationFn: () =>
      apiPost("/attendance/admin", {
        employee_id: form.employee_id,
        date: form.date || data?.today,
        status: form.status,
        note: form.note || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-attendance"] });
      toast.success("Attendance recorded");
      setForm((f) => ({ ...f, note: "" }));
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not record attendance")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/attendance/admin/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-attendance"] });
      toast.success("Record removed");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not remove the record")),
  });

  const staff = employees?.items ?? [];

  return (
    <div className="space-y-6" data-testid="admin-attendance-page">
      <header>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Attendance</p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900">Employee attendance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Employees mark their own day; you can override, correct or remove any record.
        </p>
      </header>

      <Card className="p-6" data-testid="admin-attendance-form">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={form.employee_id} onValueChange={(v: string) => setForm((f) => ({ ...f, employee_id: v }))}>
              <SelectTrigger data-testid="admin-attendance-employee-select">
                <SelectValue placeholder="Select employee">
                  {(v: string) => staff.find((s) => s.user.id === v)?.user.full_name ?? "Select employee"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.user.id} value={s.user.id}>
                    {s.user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aa-date">Date</Label>
            <Input
              id="aa-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              data-testid="admin-attendance-date-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: string) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger data-testid="admin-attendance-status-select">
                <SelectValue>{(v: string) => LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aa-note">Note</Label>
            <Input id="aa-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} data-testid="admin-attendance-note-input" />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={!form.employee_id || save.isPending}
              data-testid="admin-attendance-save-btn"
            >
              <CalendarDays className="h-4 w-4" /> {save.isPending ? "Saving…" : "Record"}
            </Button>
          </div>
        </div>
        {staff.length === 0 && (
          <p className="mt-3 text-xs text-slate-500" data-testid="admin-attendance-no-staff">
            Approve an employee first — only approved employees can have attendance.
          </p>
        )}
      </Card>

      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="aa-filter">Filter by date</Label>
          <Input id="aa-filter" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} data-testid="admin-attendance-filter-input" />
        </div>
        {dateFilter && (
          <Button variant="outline" onClick={() => setDateFilter("")} data-testid="admin-attendance-clear-filter">
            Clear
          </Button>
        )}
      </div>

      <Card className="overflow-hidden" data-testid="admin-attendance-table-card">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No attendance records" description="Records appear as employees mark their days." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marked by</TableHead>
                <TableHead>Note</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id} data-testid={`admin-attendance-row-${r.id}`}>
                  <TableCell className="font-mono text-xs">{r.date}</TableCell>
                  <TableCell className="text-sm">{r.employee_name ?? r.employee_id}</TableCell>
                  <TableCell>
                    <Badge className={TONES[r.status] ?? "bg-slate-100 text-slate-700"}>{LABELS[r.status] ?? r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{r.marked_by_role}</TableCell>
                  <TableCell className="text-xs text-slate-600">{r.note ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(r.id)} data-testid={`admin-attendance-delete-${r.id}`}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
