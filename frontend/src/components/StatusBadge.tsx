import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-slate-100 text-slate-700 border-slate-200",
  under_review: "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-teal-50 text-teal-700 border-teal-200",
  interview_scheduled: "bg-amber-50 text-amber-800 border-amber-200",
  interview_completed: "bg-amber-50 text-amber-800 border-amber-200",
  selected: "bg-green-50 text-green-700 border-green-200",
  not_selected: "bg-red-50 text-red-700 border-red-200",
  offer_received: "bg-indigo-50 text-indigo-700 border-indigo-200",
  joined: "bg-green-100 text-green-800 border-green-300",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  paused: "bg-orange-50 text-orange-700 border-orange-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
  verified: "bg-green-50 text-green-700 border-green-200",
  unverified: "bg-slate-100 text-slate-600 border-slate-200",
  needs_resubmission: "bg-orange-50 text-orange-700 border-orange-200",
  due: "bg-amber-50 text-amber-800 border-amber-200",
  payment_claimed: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  disputed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  refunded: "bg-indigo-50 text-indigo-700 border-indigo-200",
  new: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
};

export function StatusBadge({
  status,
  label,
  testId,
}: {
  status: string;
  label?: string;
  testId?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
      }`}
      data-testid={testId ?? `status-badge-${status}`}
    >
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
