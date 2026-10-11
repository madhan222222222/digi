import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, Clock } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import type { MyAttendance } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";

const SELF_STATUSES = [
  { key: "present", label: "Present" },
  { key: "half_day", label: "Half day" },
  { key: "leave", label: "On leave" },
];

export const ATTENDANCE_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  leave: "Leave",
  half_day: "Half day",
  week_off: "Week off",
};

const TONES: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-800",
  half_day: "bg-amber-100 text-amber-900",
  leave: "bg-sky-100 text-sky-800",
  absent: "bg-red-100 text-red-700",
  week_off: "bg-slate-100 text-slate-700",
};

export default function EmployeeAttendance() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("present");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-attendance"],
    queryFn: () => apiGet<MyAttendance>("/attendance/me"),
    retry: false,
  });

  const mark = useMutation({
    mutationFn: () => apiPost("/attendance/me", { status, note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
      setNote("");
      toast.success("Attendance recorded for today.");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not record attendance")),
  });

  const markedToday = data?.items.some((r) => r.date === data.today) ?? false;

  return (
    <div className="space-y-6" data-testid="employee-attendance-page">
      <header>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Attendance</p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900">My daily attendance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mark your day once — the date is set by the server. Admins manage and can correct every record.
        </p>
      </header>

      <Card className="p-6" data-testid="attendance-mark-card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label>Today ({data?.today ?? "…"})</Label>
            <Select value={status} onValueChange={(v: string) => setStatus(v)}>
              <SelectTrigger className="w-44" data-testid="attendance-status-select">
                <SelectValue>{(v: string) => ATTENDANCE_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SELF_STATUSES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="attendance-note">Note (optional)</Label>
            <Input id="attendance-note" value={note} onChange={(e) => setNote(e.target.value)} data-testid="attendance-note-input" />
          </div>
          <Button onClick={() => mark.mutate()} disabled={markedToday || mark.isPending} data-testid="attendance-mark-btn">
            <CalendarCheck className="h-4 w-4" />
            {markedToday ? "Already marked today" : mark.isPending ? "Saving…" : "Mark attendance"}
          </Button>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500" data-testid="attendance-present-count">
          <Clock className="h-3.5 w-3.5" /> {data?.present_days ?? 0} day(s) recorded as present or half day
        </p>
      </Card>

      <Card className="overflow-hidden" data-testid="attendance-history-card">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No attendance yet" description="Mark your first day above." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marked at</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id} data-testid={`attendance-row-${r.date}`}>
                  <TableCell className="font-mono text-xs">{r.date}</TableCell>
                  <TableCell>
                    <Badge className={TONES[r.status] ?? "bg-slate-100 text-slate-700"}>
                      {ATTENDANCE_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{r.check_in ?? "—"}</TableCell>
                  <TableCell className="text-xs text-slate-600">{r.marked_by_role}</TableCell>
                  <TableCell className="text-xs text-slate-600">{r.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
