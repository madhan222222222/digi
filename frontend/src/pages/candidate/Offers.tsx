import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Lock, Upload } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { OFFER_STATUS_LABELS, formatDate, formatDateTime } from "@/lib/format";
import type { DownloadLink, FileMeta, OfferRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { FileUploadButton } from "@/components/FileUploadButton";
import { EmptyState } from "@/components/EmptyState";

const EMPTY = {
  company_name: "",
  job_title: "",
  role: "",
  offer_date: "",
  joining_date: "",
  employment_type: "",
  notes: "",
};

export default function CandidateOffers() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [file, setFile] = useState<FileMeta | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["offers", "mine"],
    queryFn: () => apiGet<{ items: OfferRow[]; total: number }>("/offers"),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () =>
      apiPost("/offers", {
        company_name: form.company_name,
        job_title: form.job_title,
        role: form.role || null,
        offer_date: form.offer_date,
        joining_date: form.joining_date || null,
        employment_type: form.employment_type || null,
        offer_letter_file_id: file?.id,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      toast.success("Offer submitted for verification");
      setForm({ ...EMPTY });
      setFile(null);
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["candidate-dashboard"] });
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not submit your offer")),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  async function download(fileId: string) {
    try {
      const link = await apiPost<DownloadLink>(`/files/${fileId}/download-link`);
      window.open(link.url, "_blank");
    } catch (err) {
      toast.error(apiErrorText(err, "Could not generate a download link"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="offers-headline">
          Offers &amp; placement status
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Submit your offer letter for verification. It is stored privately and visible only to you and authorised
          reviewers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Submissions */}
        <div className="space-y-4 lg:col-span-7">
          {isLoading && <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
          {!isLoading && (data?.items.length ?? 0) === 0 && (
            <EmptyState
              icon={BadgeCheck}
              title="No offer submissions yet"
              description="Once you receive an offer, submit the details here to have your placement verified."
              testId="offers-empty-state"
            />
          )}
          {data?.items.map((offer) => (
            <Card key={offer.id} className="p-6" data-testid={`offer-card-${offer.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-base font-bold text-slate-900">{offer.job_title}</p>
                  <p className="text-sm text-slate-600">{offer.company_name}</p>
                </div>
                <StatusBadge status={offer.status} label={OFFER_STATUS_LABELS[offer.status]} testId={`offer-status-${offer.id}`} />
              </div>
              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-mono uppercase tracking-wide text-slate-400">Offer date</dt>
                  <dd className="text-slate-700">{formatDate(offer.offer_date)}</dd>
                </div>
                <div>
                  <dt className="font-mono uppercase tracking-wide text-slate-400">Joining date</dt>
                  <dd className="text-slate-700">{offer.joining_date ? formatDate(offer.joining_date) : "—"}</dd>
                </div>
                <div>
                  <dt className="font-mono uppercase tracking-wide text-slate-400">Role</dt>
                  <dd className="text-slate-700">{offer.role || "—"}</dd>
                </div>
                <div>
                  <dt className="font-mono uppercase tracking-wide text-slate-400">Employment type</dt>
                  <dd className="text-slate-700">{offer.employment_type || "—"}</dd>
                </div>
              </dl>
              {offer.review_notes && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900" data-testid={`offer-review-notes-${offer.id}`}>
                  Reviewer notes: {offer.review_notes}
                  {offer.reviewed_at ? ` (${formatDateTime(offer.reviewed_at)})` : ""}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => download(offer.offer_letter_file_id)}
                data-testid={`offer-download-btn-${offer.id}`}
              >
                <Lock className="h-4 w-4" /> View my offer letter
              </Button>
            </Card>
          ))}
        </div>

        {/* Submit form */}
        <div className="lg:col-span-5">
          <Card className="p-6" data-testid="offer-submit-card">
            <h2 className="font-heading text-lg font-bold text-slate-900">Submit an offer</h2>
            <form
              className="mt-4 space-y-4"
              data-testid="offer-submit-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!file) {
                  toast.error("Upload your offer letter (PDF) first");
                  return;
                }
                submit.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="o-company">Company name *</Label>
                <Input id="o-company" required data-testid="offer-company-input" {...field("company_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-title">Job title *</Label>
                <Input id="o-title" required data-testid="offer-title-input" {...field("job_title")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-role">Role</Label>
                <Input id="o-role" data-testid="offer-role-input" {...field("role")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="o-offerdate">Offer date *</Label>
                  <Input id="o-offerdate" type="date" required data-testid="offer-date-input" {...field("offer_date")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="o-joindate">Joining date</Label>
                  <Input id="o-joindate" type="date" data-testid="offer-joining-date-input" {...field("joining_date")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-emptype">Employment type</Label>
                <Input id="o-emptype" placeholder="Full-time" data-testid="offer-employment-type-input" {...field("employment_type")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-notes">Supporting details</Label>
                <Textarea id="o-notes" rows={2} data-testid="offer-notes-input" {...field("notes")} />
              </div>
              <div className="space-y-1.5">
                <Label>Offer letter (PDF) *</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <FileUploadButton category="offer_letter" onUploaded={setFile} testId="offer-upload-btn">
                    <Upload className="h-4 w-4" /> Upload offer letter
                  </FileUploadButton>
                  {file && <span className="font-mono text-xs text-amber-800" data-testid="offer-file-name">{file.original_name}</span>}
                </div>
              </div>
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                We never publish offer-letter contents or salary details, and we never alter your document. Only you
                and authorised reviewers can open it.
              </p>
              <Button type="submit" className="w-full" disabled={submit.isPending} data-testid="offer-submit-btn">
                {submit.isPending ? "Submitting…" : "Submit for verification"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
