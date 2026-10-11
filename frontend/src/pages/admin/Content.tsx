import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { DEFAULT_CONTENT } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { SiteContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const KEY_LABELS: Record<string, string> = {
  announcement: "Homepage announcement bar",
  about: "About DigiPhonics Technology",
  services: "Our recruitment services",
  career_support: "Candidate career support",
  employer_solutions: "Employer solutions",
  contact_info: "Contact information",
  privacy: "Privacy policy",
  terms: "Terms & conditions",
  service_agreement: "Candidate service agreement",
  refund_policy: "Refund & cancellation policy",
  footer_note: "Footer note",
};

export default function AdminContent() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: stored } = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => apiGet<SiteContent[]>("/admin/content"),
    retry: false,
  });
  const storedMap = new Map((stored ?? []).map((c) => [c.key, c]));

  const save = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => apiPut(`/admin/content/${key}`, { value }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["content", vars.key] });
      toast.success("Content updated — the public site reflects it immediately");
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not save the content")),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-content-headline">
          Website content
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Edit the public pages. Never fabricate office addresses, legal registrations, client partnerships,
          credentials or achievements.
        </p>
      </div>

      <div className="space-y-5">
        {Object.keys(KEY_LABELS).map((key) => {
          const current = storedMap.get(key)?.value ?? DEFAULT_CONTENT[key] ?? "";
          const draft = drafts[key] ?? current;
          return (
            <Card key={key} className="p-6" data-testid={`admin-content-${key}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`c-${key}`} className="font-heading text-base font-bold text-slate-900">
                  {KEY_LABELS[key]}
                </Label>
                <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400">
                  {storedMap.has(key)
                    ? `customised · updated ${formatDateTime(storedMap.get(key)?.updated_at)}`
                    : "using default copy"}
                </span>
              </div>
              <Textarea
                id={`c-${key}`}
                rows={key === "announcement" || key === "footer_note" ? 2 : 6}
                className="mt-3"
                value={draft}
                onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                data-testid={`admin-content-input-${key}`}
              />
              <Button
                size="sm"
                className="mt-3"
                disabled={draft === current || save.isPending}
                onClick={() => save.mutate({ key, value: draft })}
                data-testid={`admin-content-save-${key}`}
              >
                <Save className="h-4 w-4" /> Save
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
