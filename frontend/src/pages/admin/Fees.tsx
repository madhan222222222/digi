import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, IndianRupee, Plus, ReceiptText } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { FEE_STATUS_LABELS, formatDate, formatDateTime } from "@/lib/format";
import type { FeeRow, ServiceConfig, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

const EMPTY_SERVICE = {
  service_name: "",
  description: "",
  fee_amount: "",
  currency: "INR",
  tax_details: "",
  who_pays: "candidate",
  trigger_conditions: "",
  refund_cancellation_terms: "",
  due_terms: "",
  active: true,
};

export default function AdminFees() {
  const qc = useQueryClient();
  const [service, setService] = useState({ ...EMPTY_SERVICE });
  const [serviceOpen, setServiceOpen] = useState(false);

  const { data: services } = useQuery({
    queryKey: ["admin-fee-services"],
    queryFn: () => apiGet<ServiceConfig[]>("/admin/fee-services"),
    retry: false,
  });
  const { data: records } = useQuery({
    queryKey: ["admin-fee-records"],
    queryFn: () => apiGet<{ items: FeeRow[]; total: number }>("/admin/fee-records"),
    retry: false,
  });
  const { data: candidates } = useQuery({
    queryKey: ["admin-users", "candidate"],
    queryFn: () => apiGet<{ items: UserOut[] }>("/admin/users?role=candidate"),
    retry: false,
  });

  const createService = useMutation({
    mutationFn: () =>
      apiPost<ServiceConfig>("/admin/fee-services", {
        service_name: service.service_name,
        description: service.description,
        fee_amount: parseFloat(service.fee_amount),
        currency: service.currency,
        tax_details: service.tax_details || null,
        who_pays: service.who_pays,
        trigger_conditions: service.trigger_conditions,
        refund_cancellation_terms: service.refund_cancellation_terms,
        due_terms: service.due_terms || null,
        active: service.active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fee-services"] });
      toast.success("Service configured — candidates see the terms before consenting");
      setService({ ...EMPTY_SERVICE });
      setServiceOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not create the service")),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiPut(`/admin/fee-services/${id}`, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fee-services"] });
      toast.success("Service updated");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  const confirmPayment = useMutation({
    mutationFn: ({ id, reference }: { id: string; reference: string }) =>
      apiPost(`/admin/fee-records/${id}/payment`, { provider_reference: reference, receipt_notes: "Manually reconciled by admin" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fee-records"] });
      toast.success("Payment confirmed and a receipt was issued");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not confirm the payment")),
  });

  const resolveDispute = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPost(`/admin/fee-records/${id}/dispute`, { status, admin_notes: `Resolved as ${status} by admin` }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fee-records"] });
      toast.success("Dispute updated");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  const sf = (key: keyof typeof service) => ({
    value: service[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setService((s) => ({ ...s, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-fees-headline">
          Service charges &amp; invoices
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Fees are fully configurable — nothing is hardcoded. A fee record can only be issued to a candidate who has
          already accepted that service's terms.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-4" data-testid="admin-fees-payments-disabled">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <AlertTriangle className="h-4 w-4" /> Online payment collection is disabled
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-900">
          Keep it disabled until a payment provider and approved agreement terms are configured. Confirm payments only
          through verified manual reconciliation — never from a browser redirect. Never store card numbers, CVVs, UPI
          PINs or banking passwords.
        </p>
      </Card>

      <Tabs defaultValue="services">
        <TabsList data-testid="admin-fees-tabs">
          <TabsTrigger value="services" data-testid="admin-fees-tab-services">Service configuration</TabsTrigger>
          <TabsTrigger value="records" data-testid="admin-fees-tab-records">Fee records &amp; invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
            <DialogTrigger
              className="inline-flex h-9 items-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
              data-testid="admin-fee-service-add-btn"
            >
              <Plus className="mr-1 h-4 w-4" /> Configure a service
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure a service &amp; its terms</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createService.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="s-name">Service name *</Label>
                  <Input id="s-name" required data-testid="admin-service-name-input" {...sf("service_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-desc">Candidate-facing explanation *</Label>
                  <Textarea id="s-desc" rows={3} required data-testid="admin-service-description-input" {...sf("description")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-amount">Fee amount *</Label>
                    <Input id="s-amount" type="number" min="1" step="0.01" required data-testid="admin-service-amount-input" {...sf("fee_amount")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-currency">Currency</Label>
                    <Input id="s-currency" data-testid="admin-service-currency-input" {...sf("currency")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-tax">Tax details</Label>
                    <Input id="s-tax" placeholder="e.g. GST 18% extra, if applicable" data-testid="admin-service-tax-input" {...sf("tax_details")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Who pays *</Label>
                    <Select value={service.who_pays} onValueChange={(v: string) => setService((s) => ({ ...s, who_pays: v }))}>
                      <SelectTrigger data-testid="admin-service-who-pays-select">
                        <SelectValue>{(v: string) => v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candidate">candidate</SelectItem>
                        <SelectItem value="employer">employer</SelectItem>
                        <SelectItem value="company_sponsored">company_sponsored</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-trigger">Eligibility &amp; triggering conditions *</Label>
                  <Textarea id="s-trigger" rows={2} required placeholder="e.g. applies only after an offer letter is released and verified" data-testid="admin-service-trigger-input" {...sf("trigger_conditions")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-refund">Refund &amp; cancellation terms *</Label>
                  <Textarea id="s-refund" rows={2} required data-testid="admin-service-refund-input" {...sf("refund_cancellation_terms")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-due">Due terms</Label>
                  <Input id="s-due" placeholder="e.g. payable within 15 days of invoice" data-testid="admin-service-due-input" {...sf("due_terms")} />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Checkbox checked={service.active} onCheckedChange={(v) => setService((s) => ({ ...s, active: !!v }))} data-testid="admin-service-active-checkbox" />
                  Active (visible to candidates for consent)
                </label>
                <Button type="submit" className="w-full" disabled={createService.isPending} data-testid="admin-service-save-btn">
                  {createService.isPending ? "Saving…" : "Save service"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {(services?.length ?? 0) === 0 && (
            <EmptyState
              icon={IndianRupee}
              title="No services configured"
              description="With nothing configured, no candidate can be charged anything. Configure a service only with approved, reviewed terms."
              testId="admin-fee-services-empty"
            />
          )}
          {services?.map((s) => (
            <Card key={s.id} className="p-6" data-testid={`admin-fee-service-${s.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-base font-bold text-slate-900">{s.service_name}</p>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                    v{s.version} · {s.who_pays} · created {formatDate(s.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-heading text-lg font-extrabold text-slate-900">
                    {s.currency === "INR" ? "₹" : `${s.currency} `}{s.fee_amount.toLocaleString("en-IN")}
                  </p>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                    <Checkbox checked={s.active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, active: !!v })} data-testid={`admin-service-toggle-${s.id}`} />
                    Active
                  </label>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{s.description}</p>
              <dl className="mt-3 space-y-1 text-xs text-slate-600">
                <div><dt className="inline font-semibold">Triggers: </dt><dd className="inline">{s.trigger_conditions}</dd></div>
                <div><dt className="inline font-semibold">Refund: </dt><dd className="inline">{s.refund_cancellation_terms}</dd></div>
                {s.tax_details && <div><dt className="inline font-semibold">Tax: </dt><dd className="inline">{s.tax_details}</dd></div>}
              </dl>
              <IssueInvoiceDialog service={s} candidates={candidates?.items ?? []} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          {(records?.items.length ?? 0) === 0 && (
            <EmptyState icon={ReceiptText} title="No fee records" description="Invoices appear here once issued against an accepted agreement." testId="admin-fee-records-empty" />
          )}
          {records?.items.map((r) => (
            <Card key={r.id} className="p-6" data-testid={`admin-fee-record-${r.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">{r.invoice_number}</p>
                  <p className="text-sm text-slate-600">{r.service_name}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                    {r.candidate_name} · {r.candidate_email}
                    {r.due_date ? ` · due ${formatDate(r.due_date)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-lg font-extrabold text-slate-900">
                    {r.currency === "INR" ? "₹" : `${r.currency} `}{r.amount.toLocaleString("en-IN")}
                  </p>
                  <StatusBadge status={r.status} label={FEE_STATUS_LABELS[r.status]} testId={`admin-fee-status-${r.id}`} />
                </div>
              </div>
              {r.admin_notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{r.admin_notes}</p>}
              {r.receipt_issued && (
                <p className="mt-2 rounded-lg bg-green-50 p-3 text-xs text-green-800">
                  Receipt issued{r.payment_confirmed_at ? ` ${formatDateTime(r.payment_confirmed_at)}` : ""}
                  {r.payment_confirmed_by ? ` by ${r.payment_confirmed_by}` : ""}
                  {r.provider_reference ? ` · ref ${r.provider_reference}` : ""}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status !== "paid" && (
                  <ConfirmPaymentDialog record={r} onConfirm={(reference) => confirmPayment.mutate({ id: r.id, reference })} />
                )}
                {r.status === "disputed" && (
                  <>
                    <Button variant="outline" size="xs" onClick={() => resolveDispute.mutate({ id: r.id, status: "refunded" })} data-testid={`admin-fee-refund-btn-${r.id}`}>
                      Mark refunded
                    </Button>
                    <Button variant="outline" size="xs" onClick={() => resolveDispute.mutate({ id: r.id, status: "cancelled" })} data-testid={`admin-fee-cancel-btn-${r.id}`}>
                      Cancel invoice
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => resolveDispute.mutate({ id: r.id, status: "due" })} data-testid={`admin-fee-reinstate-btn-${r.id}`}>
                      Reinstate as due
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssueInvoiceDialog({ service, candidates }: { service: ServiceConfig; candidates: UserOut[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      apiPost("/admin/fee-records", {
        candidate_id: candidateId,
        service_id: service.id,
        due_date: dueDate || null,
        admin_notes: notes || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fee-records"] });
      toast.success("Invoice issued — the candidate was notified");
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not issue the invoice")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="mt-4 inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        data-testid={`admin-issue-invoice-btn-${service.id}`}
      >
        Issue an invoice for this service
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue an invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Only candidates who have already accepted this service's terms can be invoiced — the backend rejects
            anyone else.
          </p>
          <div className="space-y-1.5">
            <Label>Candidate</Label>
            <Select value={candidateId} onValueChange={(v: string) => setCandidateId(v)}>
              <SelectTrigger data-testid={`admin-invoice-candidate-select-${service.id}`}>
                <SelectValue>{(v: string) => candidates.find((c) => c.id === v)?.full_name ?? "Select a candidate"}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`due-${service.id}`}>Due date</Label>
            <Input id={`due-${service.id}`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid={`admin-invoice-due-input-${service.id}`} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`note-${service.id}`}>Admin notes</Label>
            <Textarea id={`note-${service.id}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid={`admin-invoice-notes-input-${service.id}`} />
          </div>
          <Button className="w-full" disabled={!candidateId || mut.isPending} onClick={() => mut.mutate()} data-testid={`admin-invoice-save-${service.id}`}>
            Issue invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmPaymentDialog({ record, onConfirm }: { record: FeeRow; onConfirm: (reference: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700"
        data-testid={`admin-fee-confirm-btn-${record.id}`}
      >
        Confirm payment (manual)
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm payment for {record.invoice_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Confirm only after you have independently verified the funds (bank statement or provider dashboard). A
            browser redirect is never proof of payment.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={`ref-${record.id}`}>Payment / provider reference</Label>
            <Input
              id={`ref-${record.id}`}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / transaction reference"
              data-testid={`admin-fee-reference-input-${record.id}`}
            />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              onConfirm(reference);
              setOpen(false);
            }}
            data-testid={`admin-fee-confirm-save-${record.id}`}
          >
            Confirm &amp; issue receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
