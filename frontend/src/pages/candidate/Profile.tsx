import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Save } from "lucide-react";
import { apiPost, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { useMe } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import type { CandidateProfile, DownloadLink, FileMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadButton } from "@/components/FileUploadButton";

const WORK_MODES = [
  { value: "any", label: "Any" },
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

export default function CandidateProfilePage() {
  const { data: me } = useMe();
  const profile = me?.candidate_profile;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    category: "fresher",
    current_location: "",
    graduation_year: "",
    skills: "",
    preferred_roles: "",
    preferred_locations: "",
    preferred_work_mode: "any",
    portfolio_url: "",
    linkedin_url: "",
    education: "",
    projects: "",
    internships: "",
    certifications: "",
    previous_industry: "",
    transferable_skills: "",
    last_designation: "",
    career_break_months: "",
    career_gap_explanation: "",
    total_experience_years: "",
    current_designation: "",
    current_company: "",
    current_salary: "",
    expected_salary: "",
    notice_period: "",
  });
  const [resume, setResume] = useState<FileMeta | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      category: profile.category,
      current_location: profile.current_location ?? "",
      graduation_year: profile.graduation_year?.toString() ?? "",
      skills: profile.skills.join(", "),
      preferred_roles: profile.preferred_roles.join(", "),
      preferred_locations: profile.preferred_locations.join(", "),
      preferred_work_mode: profile.preferred_work_mode ?? "any",
      portfolio_url: profile.portfolio_url ?? "",
      linkedin_url: profile.linkedin_url ?? "",
      education: profile.education.map((e) => [e.degree, e.institution, e.year, e.score].filter(Boolean).join(" | ")).join("\n"),
      projects: profile.projects ?? "",
      internships: profile.internships ?? "",
      certifications: profile.certifications ?? "",
      previous_industry: profile.previous_industry ?? "",
      transferable_skills: profile.transferable_skills.join(", "),
      last_designation: profile.last_designation ?? "",
      career_break_months: profile.career_break_months?.toString() ?? "",
      career_gap_explanation: profile.career_gap_explanation ?? "",
      total_experience_years: profile.total_experience_years?.toString() ?? "",
      current_designation: profile.current_designation ?? "",
      current_company: profile.current_company ?? "",
      current_salary: profile.current_salary ?? "",
      expected_salary: profile.expected_salary ?? "",
      notice_period: profile.notice_period ?? "",
    });
  }, [profile]);

  const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  const save = useMutation({
    mutationFn: () =>
      apiPut<CandidateProfile>("/candidate/profile", {
        category: form.category,
        current_location: form.current_location || null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year, 10) : null,
        skills: list(form.skills),
        preferred_roles: list(form.preferred_roles),
        preferred_locations: list(form.preferred_locations),
        preferred_work_mode: form.preferred_work_mode,
        portfolio_url: form.portfolio_url || null,
        linkedin_url: form.linkedin_url || null,
        education: form.education
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [degree, institution, year, score] = line.split("|").map((p) => p.trim());
            return { degree: degree || line, institution: institution || null, year: year || null, score: score || null };
          }),
        projects: form.projects || null,
        internships: form.internships || null,
        certifications: form.certifications || null,
        previous_industry: form.previous_industry || null,
        transferable_skills: list(form.transferable_skills),
        last_designation: form.last_designation || null,
        career_break_months: form.career_break_months ? parseInt(form.career_break_months, 10) : null,
        career_gap_explanation: form.career_gap_explanation || null,
        total_experience_years: form.total_experience_years ? parseFloat(form.total_experience_years) : null,
        current_designation: form.current_designation || null,
        current_company: form.current_company || null,
        current_salary: form.current_salary || null,
        expected_salary: form.expected_salary || null,
        notice_period: form.notice_period || null,
        ...(resume ? { resume_file_id: resume.id } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["candidate-dashboard"] });
      toast.success("Profile saved");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not save your profile")),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  async function downloadResume() {
    const fileId = resume?.id ?? profile?.resume_file_id;
    if (!fileId) return;
    try {
      const link = await apiPost<DownloadLink>(`/files/${fileId}/download-link`);
      window.open(link.url, "_blank");
    } catch (err) {
      toast.error(apiErrorText(err, "Could not generate a download link"));
    }
  }

  const cat = form.category;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="profile-headline">
          My profile
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          You can change your candidate category at any time — your applications and documents stay with you.
        </p>
      </div>

      <form
        className="space-y-6"
        data-testid="candidate-profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Card className="p-6">
          <h2 className="font-heading text-lg font-bold text-slate-900">Track &amp; basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Candidate category</Label>
              <Select value={form.category} onValueChange={(v: string) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="profile-category-select">
                  <SelectValue>{(v: string) => CATEGORIES.find((c) => c.key === v)?.label ?? "Select"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-location">Current location</Label>
              <Input id="p-location" data-testid="profile-location-input" {...field("current_location")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-skills">Skills (comma separated)</Label>
              <Input id="p-skills" data-testid="profile-skills-input" {...field("skills")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-roles">Preferred roles</Label>
              <Input id="p-roles" placeholder="Backend Developer, QA Engineer" data-testid="profile-roles-input" {...field("preferred_roles")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-locations">Preferred work locations</Label>
              <Input id="p-locations" data-testid="profile-preferred-locations-input" {...field("preferred_locations")} />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred work mode</Label>
              <Select value={form.preferred_work_mode} onValueChange={(v: string) => setForm((f) => ({ ...f, preferred_work_mode: v }))}>
                <SelectTrigger data-testid="profile-work-mode-select">
                  <SelectValue>{(v: string) => WORK_MODES.find((w) => w.value === v)?.label ?? "Any"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((w) => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-linkedin">LinkedIn URL</Label>
              <Input id="p-linkedin" data-testid="profile-linkedin-input" {...field("linkedin_url")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-portfolio">Portfolio URL</Label>
              <Input id="p-portfolio" data-testid="profile-portfolio-input" {...field("portfolio_url")} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="p-education">Education (one per line: Degree | Institution | Year | Score)</Label>
            <Textarea id="p-education" rows={3} data-testid="profile-education-input" {...field("education")} />
          </div>
        </Card>

        {/* Category-specific */}
        {cat === "fresher" && (
          <Card className="p-6" data-testid="profile-fresher-section">
            <h2 className="font-heading text-lg font-bold text-slate-900">Fresher details</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-gradyear">Graduation year</Label>
                <Input id="p-gradyear" type="number" data-testid="profile-graduation-year-input" {...field("graduation_year")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-projects">Projects</Label>
                <Textarea id="p-projects" rows={3} data-testid="profile-projects-input" {...field("projects")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-internships">Internships</Label>
                <Textarea id="p-internships" rows={2} data-testid="profile-internships-input" {...field("internships")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-certs">Certifications</Label>
                <Textarea id="p-certs" rows={2} data-testid="profile-certifications-input" {...field("certifications")} />
              </div>
            </div>
          </Card>
        )}

        {cat === "non_it_to_it" && (
          <Card className="p-6" data-testid="profile-transition-section">
            <h2 className="font-heading text-lg font-bold text-slate-900">Career transition details</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-prev-industry">Previous industry &amp; work experience</Label>
                <Textarea id="p-prev-industry" rows={3} data-testid="profile-previous-industry-input" {...field("previous_industry")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-transferable">Transferable skills (comma separated)</Label>
                <Input id="p-transferable" data-testid="profile-transferable-skills-input" {...field("transferable_skills")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-projects-t">Project portfolio</Label>
                <Textarea id="p-projects-t" rows={3} data-testid="profile-projects-transition-input" {...field("projects")} />
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                Present previous experience honestly — describe what you actually did and the skills it built. You are
                never required to enroll in training to switch careers.
              </p>
            </div>
          </Card>
        )}

        {cat === "career_gap" && (
          <Card className="p-6" data-testid="profile-career-gap-section">
            <h2 className="font-heading text-lg font-bold text-slate-900">Career break details</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="p-last-desig">Last designation</Label>
                  <Input id="p-last-desig" data-testid="profile-last-designation-input" {...field("last_designation")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-break">Career break (months)</Label>
                  <Input id="p-break" type="number" min="0" data-testid="profile-career-break-input" {...field("career_break_months")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-gap-expl">Explanation of the gap (optional)</Label>
                <Textarea id="p-gap-expl" rows={3} data-testid="profile-gap-explanation-input" {...field("career_gap_explanation")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-projects-g">Previous projects &amp; current skills</Label>
                <Textarea id="p-projects-g" rows={3} data-testid="profile-projects-gap-input" {...field("projects")} />
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                This information is confidential and visible only to you and authorised reviewers. A career gap is
                never used to automatically reject your profile.
              </p>
            </div>
          </Card>
        )}

        {cat === "experienced" && (
          <Card className="p-6" data-testid="profile-experienced-section">
            <h2 className="font-heading text-lg font-bold text-slate-900">Experience details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-totexp">Total experience (years)</Label>
                <Input id="p-totexp" type="number" step="0.5" min="0" data-testid="profile-total-experience-input" {...field("total_experience_years")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-curdesig">Current designation</Label>
                <Input id="p-curdesig" data-testid="profile-current-designation-input" {...field("current_designation")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-curcomp">Current company</Label>
                <Input id="p-curcomp" data-testid="profile-current-company-input" {...field("current_company")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-notice">Notice period / availability</Label>
                <Input id="p-notice" placeholder="e.g. 60 days" data-testid="profile-notice-period-input" {...field("notice_period")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-cursal">Current salary (optional)</Label>
                <Input id="p-cursal" data-testid="profile-current-salary-input" {...field("current_salary")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-expsal">Expected salary (optional)</Label>
                <Input id="p-expsal" data-testid="profile-expected-salary-input" {...field("expected_salary")} />
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              Salary fields are optional and never shown publicly.
            </p>
          </Card>
        )}

        {/* Resume */}
        <Card className="p-6" data-testid="profile-resume-section">
          <h2 className="font-heading text-lg font-bold text-slate-900">Resume</h2>
          <p className="mt-1 text-sm text-slate-600">
            PDF or Word, up to 5 MB. Your resume is private — shared only with applications you submit.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <FileUploadButton category="resume" onUploaded={setResume} testId="profile-resume-upload-btn">
              {profile?.resume_file_id || resume ? "Replace resume" : "Upload resume"}
            </FileUploadButton>
            {(resume || profile?.resume_file_id) && (
              <Button type="button" variant="ghost" size="sm" onClick={downloadResume} data-testid="profile-resume-download-btn">
                <FileText className="h-4 w-4" /> {resume?.original_name ?? "View current resume"}
              </Button>
            )}
            {resume && <span className="font-mono text-xs text-amber-800">Save the profile to attach it.</span>}
          </div>
        </Card>

        <Button type="submit" disabled={save.isPending} data-testid="profile-save-btn">
          <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
