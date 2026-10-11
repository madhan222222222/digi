import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Lock } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { OFFER_STATUS_LABELS, formatDate, formatDateTime } from "@/lib/format";
import type { DownloadLink, OfferRow, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

function ReviewDialog({ offer }: { offer: OfferRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("approved");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () => apiPost(`/admin/offers/${offer.id}/review`, { decision, notes: notes || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-offers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Decision recorded and the candidate was notified");
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not record the decision")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white hover:bg-amber-800"
        data-testid={`admin-offer-review-btn-${offer.id}`}
      >
        Review
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review offer submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p><strong>{offer.candidate_name}</strong> · {offer.candidate_email}</p>
            <p className="mt-1">{offer.job_title} at {offer.company_name}</p>
            <p className="mt-1">Offer dated {formatDate(offer.offer_date)}{offer.joining_date ? ` · joining ${formatDate(offer.joining_date)}` : ""}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Decision</Label>
            <Select value={decision} onValueChange={(v: string) => setDecision(v)}>
              <SelectTrigger data-testid={`admin-offer-decision-select-${offer.id}`}>
                <SelectValue>{(v: string) => OFFER_STATUS_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve — verified placement</SelectItem>
                <SelectItem value="needs_resubmission">Request corrections</SelectItem>
                <SelectItem value="rejected">Not approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`on-${offer.id}`}>Notes to candidate</Label>
            <Textarea id={`on-${offer.id}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid={`admin-offer-notes-${offer.id}`} />
          </div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending} data-testid={`admin-offer-review-save-${offer.id}`}>
            Record decision
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignOfferDialog({ offer }: { offer: OfferRow }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const { data: employees } = useQuery({
    queryKey: ["admin-users", "employee"],
    queryFn: () => apiGet<{ items: UserOut[] }>("/admin/users?role=employee"),
    enabled: open,
    retry: false,
  });
  const mut = useMutation({
    mutationFn: () => apiPost("/admin/assignments", { employee_id: employeeId, assignment_type: "offer", target_id: offer.id }),
    onSuccess: () => {
      toast.success("Offer assigned for review");
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        data-testid={`admin-offer-assign-btn-${offer.id}`}
      >
        Assign reviewer
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign an employee reviewer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={employeeId} onValueChange={(v: string) => setEmployeeId(v)}>
            <SelectTrigger data-testid={`admin-offer-assign-select-${offer.id}`}>
              <SelectValue>{(v: string) => employees?.items.find((e) => e.id === v)?.full_name ?? "Select an employee"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(employees?.items ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" disabled={!employeeId || mut.isPending} onClick={() => mut.mutate()} data-testid={`admin-offer-assign-save-${offer.id}`}>
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOffers() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: () => apiGet<{ items: OfferRow[]; total: number }>("/admin/offers"),
    retry: false,
  });

  async function download(fileId: string) {
    try {
      const link = await apiPost<DownloadLink>(`/files/${fileId}/download-link`);
      window.open(link.url, "_blank");
    } catch (err) {
      toast.error(apiErrorText(err, "Could not open the offer letter"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-offers-headline">
          Offer &amp; placement verification
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Offer letters stay private. Every open and every decision is written to the audit log. Never publish offer
          contents or salary details without explicit authorization.
        </p>
      </div>

      {isLoading && <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState icon={BadgeCheck} title="No offer submissions" description="Candidate offer submissions appear here for verification." testId="admin-offers-empty" />
      )}

      <div className="space-y-4">
        {data?.items.map((offer) => (
          <Card key={offer.id} className="p-6" data-testid={`admin-offer-row-${offer.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-heading text-base font-bold text-slate-900">{offer.job_title}</p>
                <p className="text-sm text-slate-600">{offer.company_name}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                  {offer.candidate_name} · {offer.candidate_email} · submitted {formatDate(offer.created_at)}
                </p>
              </div>
              <StatusBadge status={offer.status} label={OFFER_STATUS_LABELS[offer.status]} testId={`admin-offer-status-${offer.id}`} />
            </div>
            {offer.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Candidate notes: {offer.notes}</p>}
            {offer.review_notes && (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                Last review: {offer.review_notes}
                {offer.reviewed_by_name ? ` — ${offer.reviewed_by_name}` : ""}
                {offer.reviewed_at ? ` (${formatDateTime(offer.reviewed_at)})` : ""}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ReviewDialog offer={offer} />
              <AssignOfferDialog offer={offer} />
              <Button variant="ghost" size="xs" onClick={() => download(offer.offer_letter_file_id)} data-testid={`admin-offer-open-btn-${offer.id}`}>
                <Lock className="h-3.5 w-3.5" /> Open offer letter
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
