import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { categoryByKey } from "@/lib/constants";
import type { Assignment, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "employee", designation: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role, search],
    queryFn: () =>
      apiGet<{ items: UserOut[]; total: number }>(
        `/admin/users?${role !== "all" ? `role=${role}&` : ""}${search ? `q=${encodeURIComponent(search)}` : ""}`,
      ),
    retry: false,
  });
  const { data: assignments } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: () => apiGet<{ items: Assignment[]; total: number }>("/admin/assignments"),
    retry: false,
  });

  const createStaff = useMutation({
    mutationFn: () =>
      apiPost<UserOut>("/admin/users", {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        designation: form.designation || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Staff account created");
      setForm({ email: "", password: "", full_name: "", role: "employee", designation: "" });
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not create the account")),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiPut(`/admin/users/${id}/status`, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Account status updated");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  const verifyEmployee = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPut(`/admin/employees/${id}/verification`, { status }),
    onSuccess: () => toast.success("Employee verification updated — their ID card follows approval"),
    onError: (err) => toast.error(apiErrorText(err)),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-users-headline">
            Users &amp; staff
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Public registration can only create candidate or employer accounts — staff accounts are created here.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className="inline-flex h-9 items-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
            data-testid="admin-create-staff-btn"
          >
            <Plus className="mr-1 h-4 w-4" /> Create staff account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create an employee or admin account</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createStaff.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="st-name">Full name *</Label>
                <Input id="st-name" required data-testid="admin-staff-name-input" {...field("full_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-email">Email *</Label>
                <Input id="st-email" type="email" required data-testid="admin-staff-email-input" {...field("email")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-pass">Password * (min 8 characters)</Label>
                <Input id="st-pass" type="password" required minLength={8} data-testid="admin-staff-password-input" {...field("password")} />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={(v: string) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger data-testid="admin-staff-role-select">
                    <SelectValue>{(v: string) => v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">employee</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-desig">Designation</Label>
                <Input id="st-desig" data-testid="admin-staff-designation-input" {...field("designation")} />
              </div>
              <Button type="submit" className="w-full" disabled={createStaff.isPending} data-testid="admin-staff-save-btn">
                Create account
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <form
          className="flex min-w-64 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setSearch(String(fd.get("q") ?? ""));
          }}
        >
          <Input name="q" defaultValue={search} placeholder="Search by name or email…" data-testid="admin-users-search-input" />
          <Button type="submit" data-testid="admin-users-search-btn">Search</Button>
        </form>
        <Select value={role} onValueChange={(v: string) => setRole(v)}>
          <SelectTrigger className="w-44" data-testid="admin-users-role-filter">
            <SelectValue>{(v: string) => (v === "all" ? "All roles" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {["all", "candidate", "employer", "employee", "admin"].map((r) => (
              <SelectItem key={r} value={r}>{r === "all" ? "All roles" : r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState icon={Users} title="No users found" testId="admin-users-empty" />
      )}

      {(data?.items.length ?? 0) > 0 && (
        <Card className="p-0" data-testid="admin-users-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((u) => (
                <TableRow key={u.id} data-testid={`admin-user-row-${u.id}`}>
                  <TableCell className="font-medium text-slate-900">{u.full_name}</TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-slate-600">{u.role}</span>
                    {u.company_name ? <span className="block text-[11px] text-slate-400">{u.company_name}</span> : null}
                  </TableCell>
                  <TableCell className="text-slate-600">{formatDate(u.created_at)}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.active ? "approved" : "rejected"} label={u.active ? "Active" : "Inactive"} testId={`admin-user-status-${u.id}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setStatus.mutate({ id: u.id, active: !u.active })}
                        data-testid={`admin-user-toggle-btn-${u.id}`}
                      >
                        {u.active ? "Deactivate" : "Activate"}
                      </Button>
                      {u.role === "employee" && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => verifyEmployee.mutate({ id: u.id, status: "approved" })}
                          data-testid={`admin-employee-verify-btn-${u.id}`}
                        >
                          Approve docs
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="p-6" data-testid="admin-assignments-card">
        <h2 className="font-heading text-lg font-bold text-slate-900">Employee assignments</h2>
        <p className="mt-1 text-sm text-slate-600">
          Employees access only what is assigned to them — assign jobs, applications and offers from their respective
          pages.
        </p>
        <div className="mt-4 space-y-2">
          {(assignments?.items.length ?? 0) === 0 && <p className="text-sm text-slate-500">No assignments yet.</p>}
          {assignments?.items.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs" data-testid={`admin-assignment-${a.id}`}>
              <span className="text-slate-700">
                <strong>{a.employee_name ?? a.employee_id}</strong> → {a.assignment_type}
              </span>
              <span className="font-mono text-[10px] text-slate-400">{a.target_id.slice(0, 8)}… · {formatDate(a.created_at)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
