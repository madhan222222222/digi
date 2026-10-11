// Small display formatters + label maps shared across pages.

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function salaryText(job: {
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
}): string {
  if (!job.salary_min && !job.salary_max) return "Salary not disclosed";
  const cur = job.salary_currency === "INR" ? "₹" : `${job.salary_currency} `;
  const fmt = (n: number) => (n >= 100000 ? `${Math.round((n / 100000) * 10) / 10}L` : n.toLocaleString("en-IN"));
  if (job.salary_min && job.salary_max) return `${cur}${fmt(job.salary_min)} – ${fmt(job.salary_max)}`;
  const n = (job.salary_min || job.salary_max) as number;
  return `${cur}${fmt(n)}`;
}

export function expText(min: number, max?: number | null): string {
  const maxVal = max ?? null;
  if (!min && !maxVal) return "Any experience";
  if (!maxVal) return `${min}+ yrs`;
  return `${min}–${maxVal} yrs`;
}

export const WORK_MODE_LABELS: Record<string, string> = {
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  under_review: "Application Under Review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  selected: "Selected",
  not_selected: "Not Selected",
  offer_received: "Offer Received",
  joined: "Joined",
  closed: "Closed",
};

export const APPLICATION_STAGE_ORDER = [
  "applied",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "selected",
  "offer_received",
  "joined",
] as const;

export const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  approved: "Verified Placement",
  needs_resubmission: "Corrections Requested",
  rejected: "Not Approved",
};

export const FEE_STATUS_LABELS: Record<string, string> = {
  due: "Due",
  payment_claimed: "Payment Claimed",
  paid: "Paid",
  disputed: "Disputed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  approved: "Published",
  rejected: "Rejected",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

export function isDeadlinePassed(deadline?: string | null): boolean {
  if (!deadline) return false;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  return deadline < todayIso;
}
