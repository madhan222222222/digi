import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Briefcase, ClipboardList, FileText, IndianRupee, MessageSquare, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import { APPLICATION_STATUS_LABELS, formatDateTime } from "@/lib/format";
import { categoryByKey } from "@/lib/constants";
import type { AdminStats, AuditLog } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiGet<AdminStats>("/admin/stats"),
    retry: false,
  });
  const { data: logs } = useQuery({
    queryKey: ["admin-audit", 20],
    queryFn: () => apiGet<AuditLog[]>("/admin/audit-logs?limit=20"),
    retry: false,
  });

  const kpis = [
    { label: "Total candidates", value: stats?.total_candidates ?? 0, icon: Users, to: "/admin/users" },
    { label: "Pending job approvals", value: stats?.pending_job_submissions ?? 0, icon: Briefcase, to: "/admin/jobs?status=pending" },
    { label: "Published openings", value: stats?.jobs_published ?? 0, icon: Briefcase, to: "/admin/jobs?status=approved" },
    { label: "Offers pending review", value: stats?.offers_pending ?? 0, icon: FileText, to: "/admin/offers" },
    { label: "Verified placements", value: stats?.placements_verified ?? 0, icon: FileText, to: "/admin/offers" },
    { label: "Open disputes", value: stats?.disputes_open ?? 0, icon: AlertTriangle, to: "/admin/fees" },
    { label: "Questions published", value: stats?.questions_published ?? 0, icon: ClipboardList, to: "/admin/questions" },
    { label: "New enquiries", value: stats?.enquiries_new ?? 0, icon: MessageSquare, to: "/admin/enquiries" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Admin console</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-overview-headline">
          Platform overview
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-kpi-grid">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} data-testid={`admin-kpi-${k.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <Card className="h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <k.icon className="h-4 w-4 text-amber-800" />
              <p className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-slate-900">{k.value}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">{k.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-5" data-testid="admin-categories-card">
          <h2 className="font-heading text-lg font-bold text-slate-900">Candidates by track</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(stats?.candidates_by_category ?? {}).length === 0 && (
              <p className="text-sm text-slate-500">No candidates registered yet.</p>
            )}
            {Object.entries(stats?.candidates_by_category ?? {}).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">{categoryByKey(key)?.label ?? key}</span>
                <span className="font-heading text-sm font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-slate-400">
            New in last 7 days: {stats?.new_candidates_7d ?? 0} · Employees: {stats?.employees ?? 0} · Upcoming
            interviews: {stats?.upcoming_interviews ?? 0}
          </p>
        </Card>

        <Card className="p-6 lg:col-span-7" data-testid="admin-stages-card">
          <h2 className="font-heading text-lg font-bold text-slate-900">Applications by stage</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(stats?.applications_by_stage ?? {}).length === 0 && (
              <p className="text-sm text-slate-500">No applications yet.</p>
            )}
            {Object.entries(stats?.applications_by_stage ?? {}).map(([stage, count]) => (
              <StatusBadge key={stage} status={stage} label={`${APPLICATION_STATUS_LABELS[stage] ?? stage} · ${count}`} />
            ))}
          </div>
          <h3 className="mt-6 font-heading text-base font-bold text-slate-900">Fee records</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(stats?.fee_records_by_status ?? {}).length === 0 && (
              <p className="text-sm text-slate-500">No fee records issued.</p>
            )}
            {Object.entries(stats?.fee_records_by_status ?? {}).map(([status, count]) => (
              <StatusBadge key={status} status={status} label={`${status} · ${count}`} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6" data-testid="admin-audit-card">
        <h2 className="font-heading text-lg font-bold text-slate-900">Recent audit log</h2>
        <div className="mt-4 space-y-1.5">
          {(logs?.length ?? 0) === 0 && <p className="text-sm text-slate-500">No audit events yet.</p>}
          {logs?.map((log) => (
            <div key={log.id} className="flex flex-wrap items-baseline gap-2 border-b border-slate-100 py-2 text-xs last:border-0" data-testid={`admin-audit-row-${log.id}`}>
              <span className="font-mono font-semibold text-amber-800">{log.action}</span>
              <span className="text-slate-600">
                {log.actor_email ?? "system"} {log.actor_role ? `(${log.actor_role})` : ""}
              </span>
              {log.details && <span className="text-slate-400">{log.details}</span>}
              <span className="ml-auto font-mono text-[10px] uppercase text-slate-400">{formatDateTime(log.created_at)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
