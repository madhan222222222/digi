import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, CheckCircle2, Clock, FileCheck2, IdCard, Send, Upload } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { EmployeeProfile, FileMeta, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileUploadButton } from "@/components/FileUploadButton";

interface EmployeeMe {
  user: UserOut;
  profile: EmployeeProfile;
}

const DOC_TYPES: { key: string; label: string; hint: string }[] = [
  { key: "aadhaar", label: "Aadhaar card", hint: "PDF / JPG / PNG, max 5 MB" },
  { key: "pan", label: "PAN card", hint: "PDF / JPG / PNG, max 5 MB" },
  { key: "certificate", label: "Education certificate", hint: "Highest qualification certificate" },
];

const STATUS_COPY: Record<string, { label: string; tone: string; note: string }> = {
  pending: { label: "Onboarding in progress", tone: "bg-slate-100 text-slate-700", note: "Complete both steps and submit for admin approval." },
  submitted: { label: "Awaiting admin approval", tone: "bg-amber-100 text-amber-900", note: "An admin is reviewing your details and documents. You will be notified." },
  approved: { label: "Approved", tone: "bg-emerald-100 text-emerald-800", note: "Your portal, employee ID card and daily attendance are unlocked." },
  rejected: { label: "Returned for correction", tone: "bg-red-100 text-red-700", note: "Update your details / documents and submit again." },
};

export default function EmployeeOnboarding() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["employee-me"],
    queryFn: () => apiGet<EmployeeMe>("/employee/me"),
    retry: false,
  });

  const [form, setForm] = useState({
    full_name: "",
    father_name: "",
    mother_name: "",
    date_of_birth: "",
    phone: "",
    address: "",
    emergency_contact: "",
    designation: "",
  });
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!data || seeded) return;
    setForm({
      full_name: data.user.full_name ?? "",
      father_name: data.profile.father_name ?? "",
      mother_name: data.profile.mother_name ?? "",
      date_of_birth: data.profile.date_of_birth ?? "",
      phone: data.user.phone ?? "",
      address: data.profile.address ?? "",
      emergency_contact: data.profile.emergency_contact ?? "",
      designation: data.profile.designation ?? "",
    });
    setPhotoId(data.profile.photo_file_id ?? null);
    setSeeded(true);
  }, [data, seeded]);

  const saveDetails = useMutation({
    mutationFn: () =>
      apiPut<EmployeeProfile>("/employee/onboarding/details", {
        full_name: form.full_name,
        father_name: form.father_name,
        mother_name: form.mother_name,
        date_of_birth: form.date_of_birth,
        phone: form.phone,
        address: form.address,
        emergency_contact: form.emergency_contact || null,
        designation: form.designation || null,
        photo_file_id: photoId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-me"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Step 1 saved — now upload your documents.");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not save your details")),
  });

  const addDoc = useMutation({
    mutationFn: (payload: { file_id: string; doc_type: string; label: string }) =>
      apiPost<EmployeeProfile>("/employee/documents", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-me"] });
      toast.success("Document uploaded");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not attach the document")),
  });

  const submit = useMutation({
    mutationFn: () => apiPost<EmployeeProfile>("/employee/onboarding/submit"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-me"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Submitted for admin approval.");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not submit your onboarding")),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500" data-testid="onboarding-loading">Loading your onboarding…</p>;
  }

  const profile = data.profile;
  const status = profile.verification_status || "pending";
  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending;
  const detailsDone = Boolean(profile.father_name && profile.mother_name && profile.date_of_birth);
  const uploaded = new Set((profile.documents ?? []).map((d) => d.doc_type));
  const docsDone = DOC_TYPES.every((d) => uploaded.has(d.key));
  const locked = status === "submitted" || status === "approved";

  return (
    <div className="space-y-6" data-testid="employee-onboarding-page">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Employee onboarding</p>
          <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900">
            Three steps to your employee portal
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{copy.note}</p>
        </div>
        <Badge className={copy.tone} data-testid="onboarding-status-badge">
          {copy.label}
        </Badge>
      </header>

      {profile.review_note && status === "rejected" && (
        <Card className="border-red-200 bg-red-50 p-4" data-testid="onboarding-review-note">
          <p className="text-sm font-semibold text-red-800">Admin note</p>
          <p className="mt-1 text-sm text-red-700">{profile.review_note}</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3" data-testid="onboarding-steps">
        {[
          { n: 1, label: "Personal details", done: detailsDone, icon: FileCheck2 },
          { n: 2, label: "Identity documents", done: docsDone, icon: Upload },
          { n: 3, label: "Admin approval", done: status === "approved", icon: BadgeCheck },
        ].map((s) => (
          <Card
            key={s.n}
            className={`flex items-center gap-3 p-4 ${s.done ? "border-emerald-300 bg-emerald-50/60" : ""}`}
            data-testid={`onboarding-step-card-${s.n}`}
          >
            {s.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <s.icon className="h-5 w-5 text-slate-400" />}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Step {s.n}</p>
              <p className="text-sm font-semibold text-slate-900">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Step 1 */}
      <Card className="p-6" data-testid="onboarding-details-card">
        <h2 className="font-heading text-lg font-bold text-slate-900">Step 1 · Personal details</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          data-testid="onboarding-details-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveDetails.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ob-name">Full name *</Label>
            <Input id="ob-name" required disabled={locked} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} data-testid="onboarding-full-name-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-father">Father's name *</Label>
            <Input id="ob-father" required disabled={locked} value={form.father_name} onChange={(e) => setForm((f) => ({ ...f, father_name: e.target.value }))} data-testid="onboarding-father-name-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-mother">Mother's name *</Label>
            <Input id="ob-mother" required disabled={locked} value={form.mother_name} onChange={(e) => setForm((f) => ({ ...f, mother_name: e.target.value }))} data-testid="onboarding-mother-name-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-dob">Date of birth *</Label>
            <Input id="ob-dob" type="date" required disabled={locked} value={form.date_of_birth} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} data-testid="onboarding-dob-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-phone">Phone *</Label>
            <Input id="ob-phone" required disabled={locked} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} data-testid="onboarding-phone-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-emergency">Emergency contact</Label>
            <Input id="ob-emergency" disabled={locked} value={form.emergency_contact} onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))} data-testid="onboarding-emergency-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-designation">Designation you are joining as</Label>
            <Input id="ob-designation" disabled={locked} placeholder="e.g. Recruitment Executive" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} data-testid="onboarding-designation-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Passport photo (for your ID card)</Label>
            <div className="flex items-center gap-3">
              {photoId && (
                <img src={`/api/files/public/${photoId}`} alt="Employee photo" className="h-12 w-12 rounded-lg object-cover" data-testid="onboarding-photo-preview" />
              )}
              <FileUploadButton category="photo" onUploaded={(m: FileMeta) => setPhotoId(m.id)} testId="onboarding-photo-upload-btn">
                <Upload className="h-4 w-4" /> {photoId ? "Replace photo" : "Upload photo"}
              </FileUploadButton>
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ob-address">Current address *</Label>
            <Textarea id="ob-address" required rows={3} disabled={locked} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} data-testid="onboarding-address-input" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={locked || saveDetails.isPending} data-testid="onboarding-save-details-btn">
              {saveDetails.isPending ? "Saving…" : "Save details & continue"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Step 2 */}
      <Card className="p-6" data-testid="onboarding-documents-card">
        <h2 className="font-heading text-lg font-bold text-slate-900">Step 2 · Identity &amp; education documents</h2>
        {!detailsDone ? (
          <p className="mt-2 text-sm text-slate-500" data-testid="onboarding-documents-locked">
            Save your personal details first — uploads unlock after step 1.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {DOC_TYPES.map((d) => {
              const existing = (profile.documents ?? []).find((doc) => doc.doc_type === d.key);
              return (
                <div
                  key={d.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                  data-testid={`onboarding-doc-row-${d.key}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{d.label}</p>
                    <p className="text-xs text-slate-500">{existing ? `Uploaded ${formatDate(existing.uploaded_at)}` : d.hint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {existing && (
                      <Badge className="bg-emerald-100 text-emerald-800" data-testid={`onboarding-doc-status-${d.key}`}>
                        Uploaded
                      </Badge>
                    )}
                    {!locked && (
                      <FileUploadButton
                        category="document"
                        onUploaded={(m: FileMeta) => addDoc.mutate({ file_id: m.id, doc_type: d.key, label: d.label })}
                        testId={`onboarding-doc-upload-${d.key}`}
                      >
                        <Upload className="h-4 w-4" /> {existing ? "Replace" : "Upload"}
                      </FileUploadButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Step 3 */}
      <Card className="p-6" data-testid="onboarding-submit-card">
        <h2 className="font-heading text-lg font-bold text-slate-900">Step 3 · Submit for admin approval</h2>
        <p className="mt-1 text-sm text-slate-600">
          Only an admin can approve your onboarding. Once approved you receive your employee ID, photo ID card, working
          days and daily attendance.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => submit.mutate()}
            disabled={!detailsDone || !docsDone || locked || submit.isPending}
            data-testid="onboarding-submit-btn"
          >
            <Send className="h-4 w-4" /> {submit.isPending ? "Submitting…" : "Submit for approval"}
          </Button>
          {status === "submitted" && (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-800" data-testid="onboarding-awaiting-note">
              <Clock className="h-4 w-4" /> Submitted {profile.submitted_at ? formatDate(profile.submitted_at) : ""} — awaiting admin approval
            </span>
          )}
          {status === "approved" && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700" data-testid="onboarding-approved-note">
              <IdCard className="h-4 w-4" /> Approved — open My Workspace for your ID card
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
