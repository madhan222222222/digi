import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, FileCheck2, IndianRupee, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { FEE_STATUS_LABELS, formatDate, formatDateTime } from "@/lib/format";
import type { FeeAgreement, FeeRecord, ServiceConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default function CandidateServices() {
  const qc = useQueryClient();

  const { data: services } = useQuery({
    queryKey: ["fee-services"],
    queryFn: () => apiGet<ServiceConfig[]>("/fees/services"),
    retry: false,
  });
  const { data: agreements } = useQuery({
    queryKey: ["fee-agreements"],
    queryFn: () => apiGet<FeeAgreement[]>("/fees/agreements/me"),
    retry: false,
  });
  const { data: invoices } = useQuery({
    queryKey: ["fee-invoices"],
    queryFn: () => apiGet<FeeRecord[]>("/fees/invoices"),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: (serviceId: string) => apiPost<FeeAgreement>("/fees/agreements", { service_id: serviceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-agreements"] });
      toast.success("Terms accepted — the version and timestamp have been recorded.");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not record your acceptance")),
  });

  const dispute = useMutation({
    mutationFn: (invoiceId: string) =>
      apiPost(`/fees/invoices/${invoiceId}/dispute`, { reason: "Candidate raised a dispute from the portal" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-invoices"] });
      toast.success("Dispute recorded — our team will review it.");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not raise the dispute")),
  });

  const acceptedIds = new Set((agreements ?? []).map((a) => a.service_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="services-headline">
          Service charges &amp; invoices
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          No fee applies merely because you registered, uploaded a resume, applied for a job, or received an offer
          letter. A charge applies only under a service agreement you accept explicitly.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5" data-testid="services-payment-disabled-banner">
        <p className="flex items-center gap-2 font-heading text-sm font-bold text-amber-900">
          <AlertTriangle className="h-4 w-4" /> Online payments are disabled
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-900">
          Payment collection stays switched off until a payment provider and the approved agreement terms are
          configured by DigiPhonics. Any invoice issued meanwhile is settled only through manual reconciliation
          confirmed by our team — a browser redirect alone never marks an invoice paid. We never store card numbers,
          CVVs, UPI PINs or banking passwords.
        </p>
      </Card>

      {/* Services + terms */}
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-900">Available services &amp; terms</h2>
        <div className="mt-4 space-y-4" data-testid="services-list">
          {(services?.length ?? 0) === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No service charges are configured"
              description="There is nothing for you to accept or pay right now. If DigiPhonics configures a service later, its full terms appear here before you consent."
              testId="services-empty-state"
            />
          )}
          {services?.map((s) => {
            const accepted = acceptedIds.has(s.id);
            const agreement = agreements?.find((a) => a.service_id === s.id);
            return (
              <Card key={s.id} className="p-6" data-testid={`service-card-${s.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-base font-bold text-slate-900">{s.service_name}</p>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                      Terms version {s.version}
                    </p>
                  </div>
                  <p className="font-heading text-xl font-extrabold text-slate-900" data-testid={`service-fee-${s.id}`}>
                    {s.currency === "INR" ? "₹" : `${s.currency} `}
                    {s.fee_amount.toLocaleString("en-IN")}
                  </p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{s.description}</p>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-mono uppercase tracking-wide text-slate-400">Who pays</dt>
                    <dd className="text-slate-700">{s.who_pays}</dd>
                  </div>
                  <div>
                    <dt className="font-mono uppercase tracking-wide text-slate-400">Tax details</dt>
                    <dd className="text-slate-700">{s.tax_details || "Not applicable"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-mono uppercase tracking-wide text-slate-400">When the fee applies</dt>
                    <dd className="whitespace-pre-wrap text-slate-700">{s.trigger_conditions}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-mono uppercase tracking-wide text-slate-400">Refund &amp; cancellation</dt>
                    <dd className="whitespace-pre-wrap text-slate-700">{s.refund_cancellation_terms}</dd>
                  </div>
                  {s.due_terms && (
                    <div className="sm:col-span-2">
                      <dt className="font-mono uppercase tracking-wide text-slate-400">Due terms</dt>
                      <dd className="text-slate-700">{s.due_terms}</dd>
                    </div>
                  )}
                </dl>
                {accepted ? (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800" data-testid={`service-accepted-${s.id}`}>
                    <FileCheck2 className="h-4 w-4" /> Accepted on {formatDateTime(agreement?.accepted_at)} (version{" "}
                    {agreement?.terms_version})
                  </p>
                ) : (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => accept.mutate(s.id)}
                    disabled={accept.isPending}
                    data-testid={`service-accept-btn-${s.id}`}
                  >
                    I have read and accept these terms
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-900">My invoices</h2>
        <div className="mt-4 space-y-4" data-testid="invoices-list">
          {(invoices?.length ?? 0) === 0 && (
            <EmptyState
              icon={IndianRupee}
              title="No invoices"
              description="You have no fee records. Invoices appear only when a contractual condition you accepted is met."
              testId="invoices-empty-state"
            />
          )}
          {invoices?.map((inv) => (
            <Card key={inv.id} className="p-6" data-testid={`invoice-card-${inv.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900" data-testid={`invoice-number-${inv.id}`}>
                    {inv.invoice_number}
                  </p>
                  <p className="text-sm text-slate-600">{inv.service_name}</p>
                  {inv.due_date && (
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                      Due {formatDate(inv.due_date)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-heading text-xl font-extrabold text-slate-900">
                    {inv.currency === "INR" ? "₹" : `${inv.currency} `}
                    {inv.amount.toLocaleString("en-IN")}
                  </p>
                  <StatusBadge status={inv.status} label={FEE_STATUS_LABELS[inv.status]} testId={`invoice-status-${inv.id}`} />
                </div>
              </div>
              {inv.receipt_issued && (
                <p className="mt-3 rounded-lg bg-green-50 p-3 text-xs text-green-800" data-testid={`invoice-receipt-${inv.id}`}>
                  Receipt issued{inv.payment_confirmed_at ? ` on ${formatDateTime(inv.payment_confirmed_at)}` : ""}
                  {inv.provider_reference ? ` · reference ${inv.provider_reference}` : ""}
                  {inv.receipt_notes ? ` · ${inv.receipt_notes}` : ""}
                </p>
              )}
              {inv.admin_notes && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {inv.admin_notes}
                </p>
              )}
              {!["paid", "cancelled", "refunded", "disputed"].includes(inv.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => dispute.mutate(inv.id)}
                  disabled={dispute.isPending}
                  data-testid={`invoice-dispute-btn-${inv.id}`}
                >
                  Raise a dispute / request cancellation
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
