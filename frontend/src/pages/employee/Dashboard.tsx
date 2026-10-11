import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Briefcase, IdCard, Lock, Send, Upload, Users } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { useMe } from "@/lib/session";
import {
  APPLICATION_STATUS_LABELS,
  JOB_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import type { ApplicationRow, DownloadLink, EmployeeProfile, FileMeta, IdCard as IdCardType, Job, OfferRow, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { StageRail } from "@/components/StageRail";
import { FileUploadButton } from "@/components/FileUploadButton";
import { EmptyState } from "@/components/EmptyState";

const STAGES = Object.keys(APPLICATION_STATUS_LABELS);

function StatusDialog({ app }: { app: ApplicationRow }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(app.status);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: () => apiPost(`/employee/applications/${app.id}/status`, { status, note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-applications"] });
      toast.success("Stage updated and the candidate was notified.");
      setOpen(false);
      setNote("");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not update the stage")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        data-testid={`employee-update-stage-btn-${app.id}`}
      >
        Update stage
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update application stage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {app.job_title} · {app.candidate_name}
          </p>
          <div className="space-y-1.5">
            <Label>New stage</Label>
            <Select value={status} onValueChange={(v: string) => setStatus(v)}>
              <SelectTrigger data-testid={`employee-stage-select-${app.id}`}>
                <SelectValue>{(v: string) => APPLICATION_STATUS_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`note-${app.id}`}>Note to the candidate (optional)</Label>
            <Textarea id={`note-${app.id}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-testid={`employee-stage-note-${app.id}`} />
          </div>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full" data-testid={`employee-stage-save-${app.id}`}>
            {mut.isPending ? "Saving…" : "Save stage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InterviewDialog({ app }: { app: ApplicationRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    scheduled_at: "",
    timezone: "Asia/Kolkata",
    interview_type: "online",
    meeting_link: "",
    venue: "",
    interviewer_name: "",
    interviewer_designation: "",
  });

  const mut = useMutation({
    mutationFn: () =>
      apiPost(`/applications/${app.id}/interviews`, {
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        timezone: form.timezone,
        interview_type: form.interview_type,
        meeting_link: form.meeting_link || null,
        venue: form.venue || null,
        interviewer_name: form.interviewer_name || null,
        interviewer_designation: form.interviewer_designation || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-applications"] });
      toast.success("Interview scheduled — the candidate was notified.");
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not schedule the interview")),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white hover:bg-amber-800"
        data-testid={`employee-schedule-interview-btn-${app.id}`}
      >
        Schedule interview
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule an interview</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`iv-when-${app.id}`}>Date &amp; time *</Label>
            <Input id={`iv-when-${app.id}`} type="datetime-local" required data-testid={`employee-interview-datetime-${app.id}`} {...field("scheduled_at")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`iv-tz-${app.id}`}>Time zone</Label>
              <Input id={`iv-tz-${app.id}`} data-testid={`employee-interview-timezone-${app.id}`} {...field("timezone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.interview_type} onValueChange={(v: string) => setForm((f) => ({ ...f, interview_type: v }))}>
                <SelectTrigger data-testid={`employee-interview-type-${app.id}`}>
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">online</SelectItem>
                  <SelectItem value="onsite">onsite</SelectItem>
                  <SelectItem value="phone">phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`iv-link-${app.id}`}>Meeting link</Label>
            <Input id={`iv-link-${app.id}`} placeholder="https://" data-testid={`employee-interview-link-${app.id}`} {...field("meeting_link")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`iv-venue-${app.id}`}>Venue</Label>
            <Input id={`iv-venue-${app.id}`} data-testid={`employee-interview-venue-${app.id}`} {...field("venue")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`iv-name-${app.id}`}>Interviewer</Label>
              <Input id={`iv-name-${app.id}`} data-testid={`employee-interview-interviewer-${app.id}`} {...field("interviewer_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`iv-desig-${app.id}`}>Designation</Label>
              <Input id={`iv-desig-${app.id}`} {...field("interviewer_designation")} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={mut.isPending} data-testid={`employee-interview-save-${app.id}`}>
            {mut.isPending ? "Scheduling…" : "Schedule & notify candidate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MessageDialog({ app }: { app: ApplicationRow }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const mut = useMutation({
    mutationFn: () => apiPost("/employee/notifications", { application_id: app.id, title: form.title, body: form.body || null }),
    onSuccess: () => {
      toast.success("Notification sent to the candidate");
      setOpen(false);
      setForm({ title: "", body: "" });
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not send the notification")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        data-testid={`employee-message-btn-${app.id}`}
      >
        Notify candidate
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a notification</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`msg-title-${app.id}`}>Title *</Label>
            <Input
              id={`msg-title-${app.id}`}
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              data-testid={`employee-message-title-${app.id}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`msg-body-${app.id}`}>Message</Label>
            <Textarea
              id={`msg-body-${app.id}`}
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              data-testid={`employee-message-body-${app.id}`}
            />
          </div>
          <Button type="submit" className="w-full" disabled={mut.isPending} data-testid={`employee-message-send-${app.id}`}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeeDashboard() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [docForm, setDocForm] = useState({ doc_type: "", label: "" });

  const { data: meData } = useQuery({
    queryKey: ["employee-me"],
    queryFn: () => apiGet<{ user: UserOut; profile: EmployeeProfile }>("/employee/me"),
    retry: false,
  });
  const { data: apps } = useQuery({
    queryKey: ["employee-applications"],
    queryFn: () => apiGet<{ items: ApplicationRow[]; total: number }>("/employee/assigned/applications"),
    retry: false,
  });
  const { data: jobs } = useQuery({
    queryKey: ["employee-jobs"],
    queryFn: () => apiGet<Job[]>("/employee/assigned/jobs"),
    retry: false,
  });
  const { data: offers } = useQuery({
    queryKey: ["employee-offers"],
    queryFn: () => apiGet<{ items: OfferRow[]; total: number }>("/employee/assigned/offers"),
    retry: false,
  });
  const { data: idCard } = useQuery({
    queryKey: ["employee-id-card"],
    queryFn: () => apiGet<IdCardType>("/employee/id-card"),
    retry: false,
    enabled: meData?.profile?.verification_status === "approved",
  });

  const [selfForm, setSelfForm] = useState({ designation: "", department: "", phone: "" });
  const saveSelf = useMutation({
    mutationFn: () =>
      apiPut("/employee/me", {
        designation: selfForm.designation || null,
        department: selfForm.department || null,
        phone: selfForm.phone || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-me"] });
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  const addDoc = useMutation({
    mutationFn: (file: FileMeta) =>
      apiPost("/employee/documents", { file_id: file.id, doc_type: docForm.doc_type || "employment", label: docForm.label || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-me"] });
      toast.success("Document uploaded for verification");
      setDocForm({ doc_type: "", label: "" });
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  const reviewOffer = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) =>
      apiPost(`/offers/${id}/review`, { decision, notes: `Reviewed by ${me?.user?.full_name ?? "assigned reviewer"}` }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-offers"] });
      toast.success("Decision recorded");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not record the decision")),
  });

  async function download(fileId: string) {
    try {
      const link = await apiPost<DownloadLink>(`/files/${fileId}/download-link`);
      window.open(link.url, "_blank");
    } catch (err) {
      toast.error(apiErrorText(err, "Not authorized to open this document"));
    }
  }

  const profile = meData?.profile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="employee-headline">
          My workspace
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          You see only the records assigned to you. Candidate documents are never accessible by default.
        </p>
      </div>

      <Tabs defaultValue="work">
        <TabsList data-testid="employee-tabs">
          <TabsTrigger value="work" data-testid="employee-tab-work">Assigned work</TabsTrigger>
          <TabsTrigger value="offers" data-testid="employee-tab-offers">Offer reviews</TabsTrigger>
          <TabsTrigger value="profile" data-testid="employee-tab-profile">My profile &amp; ID</TabsTrigger>
        </TabsList>

        {/* Assigned work */}
        <TabsContent value="work" className="space-y-6">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Assigned applications</h2>
            <div className="mt-4 space-y-4" data-testid="employee-applications-list">
              {(apps?.items.length ?? 0) === 0 && (
                <EmptyState
                  icon={Users}
                  title="No applications assigned"
                  description="An admin assigns candidate applications to you; they appear here with stage controls."
                  testId="employee-applications-empty"
                />
              )}
              {apps?.items.map((app) => (
                <Card key={app.id} className="p-6" data-testid={`employee-application-${app.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-base font-bold text-slate-900">{app.job_title}</p>
                      <p className="text-sm text-slate-600">{app.company_name}</p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                        {app.candidate_name} · {app.candidate_email}
                      </p>
                    </div>
                    <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status]} />
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <StageRail current={app.status} testPrefix={`employee-rail-${app.id}`} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusDialog app={app} />
                    <InterviewDialog app={app} />
                    <MessageDialog app={app} />
                    {app.resume_file_id && (
                      <Button variant="ghost" size="xs" onClick={() => download(app.resume_file_id!)} data-testid={`employee-resume-btn-${app.id}`}>
                        <Lock className="h-3.5 w-3.5" /> Open resume
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Assigned job submissions</h2>
            <div className="mt-4 space-y-3" data-testid="employee-jobs-list">
              {(jobs?.length ?? 0) === 0 && (
                <EmptyState icon={Briefcase} title="No job submissions assigned" testId="employee-jobs-empty" />
              )}
              {jobs?.map((job) => (
                <Card key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-4" data-testid={`employee-job-${job.id}`}>
                  <div>
                    <p className="font-heading text-sm font-bold text-slate-900">{job.title}</p>
                    <p className="text-xs text-slate-500">
                      {job.company_name} · submitted {formatDate(job.posted_at)}
                    </p>
                  </div>
                  <StatusBadge status={job.status} label={JOB_STATUS_LABELS[job.status]} />
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Offer reviews */}
        <TabsContent value="offers" className="space-y-4">
          {(offers?.items.length ?? 0) === 0 && (
            <EmptyState
              icon={BadgeCheck}
              title="No offer submissions assigned"
              description="Assigned offer-letter submissions appear here for review."
              testId="employee-offers-empty"
            />
          )}
          {offers?.items.map((offer) => (
            <Card key={offer.id} className="p-6" data-testid={`employee-offer-${offer.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-base font-bold text-slate-900">{offer.job_title}</p>
                  <p className="text-sm text-slate-600">{offer.company_name}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                    {offer.candidate_name} · offer dated {formatDate(offer.offer_date)}
                  </p>
                </div>
                <StatusBadge status={offer.status} label={OFFER_STATUS_LABELS[offer.status]} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="xs" onClick={() => download(offer.offer_letter_file_id)} data-testid={`employee-offer-open-${offer.id}`}>
                  <Lock className="h-3.5 w-3.5" /> Open offer letter
                </Button>
                <Button size="xs" onClick={() => reviewOffer.mutate({ id: offer.id, decision: "approved" })} data-testid={`employee-offer-approve-${offer.id}`}>
                  Approve
                </Button>
                <Button variant="outline" size="xs" onClick={() => reviewOffer.mutate({ id: offer.id, decision: "needs_resubmission" })} data-testid={`employee-offer-resubmit-${offer.id}`}>
                  Request corrections
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Profile + ID */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6" data-testid="employee-profile-card">
              <h2 className="font-heading text-lg font-bold text-slate-900">Employee profile</h2>
              <dl className="mt-4 grid gap-2 text-xs">
                <div>
                  <dt className="font-mono uppercase tracking-wide text-slate-400">Employee code</dt>
                  <dd className="font-mono text-sm text-slate-800" data-testid="employee-code">{profile?.employee_code ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-mono uppercase tracking-wide text-slate-400">Verification</dt>
                  <dd><StatusBadge status={profile?.verification_status ?? "pending"} /></dd>
                </div>
              </dl>
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSelf.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="e-desig">Designation</Label>
                  <Input
                    id="e-desig"
                    placeholder={profile?.designation ?? "e.g. Talent Acquisition Specialist"}
                    value={selfForm.designation}
                    onChange={(e) => setSelfForm((f) => ({ ...f, designation: e.target.value }))}
                    data-testid="employee-designation-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-dept">Department</Label>
                  <Input
                    id="e-dept"
                    placeholder={profile?.department ?? "Recruitment"}
                    value={selfForm.department}
                    onChange={(e) => setSelfForm((f) => ({ ...f, department: e.target.value }))}
                    data-testid="employee-department-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-phone">Phone</Label>
                  <Input
                    id="e-phone"
                    value={selfForm.phone}
                    onChange={(e) => setSelfForm((f) => ({ ...f, phone: e.target.value }))}
                    data-testid="employee-phone-input"
                  />
                </div>
                <Button type="submit" size="sm" disabled={saveSelf.isPending} data-testid="employee-profile-save-btn">
                  Save profile
                </Button>
              </form>
            </Card>

            <Card className="p-6" data-testid="employee-id-card-panel">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900">
                <IdCard className="h-4 w-4 text-amber-800" /> Virtual employee ID
              </h2>
              {idCard?.issued ? (
                <div className="mt-4 rounded-xl bg-hero p-5 text-hero-foreground" data-testid="employee-id-card">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">{idCard.company}</p>
                  <p className="mt-3 font-heading text-xl font-extrabold">{idCard.full_name}</p>
                  <p className="text-sm text-hero-muted">{idCard.designation || "—"}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wide text-hero-muted">Employee code</p>
                      <p className="font-mono text-sm font-bold text-amber-400">{idCard.employee_code}</p>
                    </div>
                    <p className="font-mono text-[10px] text-hero-muted">{idCard.department}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-900" data-testid="employee-id-card-pending">
                  Your virtual ID card is issued after an admin verifies your uploaded employment documents.
                </p>
              )}
            </Card>
          </div>

          <Card className="p-6" data-testid="employee-documents-card">
            <h2 className="font-heading text-lg font-bold text-slate-900">Employment documents</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload only what policy requires. Documents are private and reviewed by an admin.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="doc-type">Document type</Label>
                <Input
                  id="doc-type"
                  placeholder="e.g. employment, education"
                  value={docForm.doc_type}
                  onChange={(e) => setDocForm((f) => ({ ...f, doc_type: e.target.value }))}
                  data-testid="employee-doc-type-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-label">Label</Label>
                <Input
                  id="doc-label"
                  value={docForm.label}
                  onChange={(e) => setDocForm((f) => ({ ...f, label: e.target.value }))}
                  data-testid="employee-doc-label-input"
                />
              </div>
              <div className="flex items-end">
                <FileUploadButton category="document" onUploaded={(file) => addDoc.mutate(file)} testId="employee-doc-upload-btn">
                  <Upload className="h-4 w-4" /> Upload
                </FileUploadButton>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {(profile?.documents.length ?? 0) === 0 && <p className="text-sm text-slate-500">No documents uploaded.</p>}
              {profile?.documents.map((doc) => (
                <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3" data-testid={`employee-document-${doc.id}`}>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.label || doc.doc_type}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-slate-400">
                      {doc.doc_type} · {formatDateTime(doc.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={doc.verification_status} />
                    <Button variant="ghost" size="xs" onClick={() => download(doc.file_id)} data-testid={`employee-document-open-${doc.id}`}>
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
