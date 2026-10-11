import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import type { ContactEnquiry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default function AdminEnquiries() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: () => apiGet<{ items: ContactEnquiry[]; total: number }>("/admin/enquiries"),
    retry: false,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPut(`/admin/enquiries/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enquiries"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Enquiry updated");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-enquiries-headline">
          Contact enquiries
        </h1>
        <p className="mt-1 text-sm text-slate-600">Messages submitted through the public contact forms.</p>
      </div>

      {isLoading && <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState icon={MessageSquare} title="No enquiries" description="Submitted contact forms arrive here." testId="admin-enquiries-empty" />
      )}

      <div className="space-y-4">
        {data?.items.map((e) => (
          <Card key={e.id} className="p-6" data-testid={`admin-enquiry-${e.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-heading text-base font-bold text-slate-900">{e.subject || "General enquiry"}</p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                  {e.name} · {e.email}
                  {e.phone ? ` · ${e.phone}` : ""} · {formatDateTime(e.created_at)}
                </p>
              </div>
              <StatusBadge status={e.status} testId={`admin-enquiry-status-${e.id}`} />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{e.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {e.status !== "in_progress" && (
                <Button variant="outline" size="xs" onClick={() => update.mutate({ id: e.id, status: "in_progress" })} data-testid={`admin-enquiry-progress-btn-${e.id}`}>
                  Mark in progress
                </Button>
              )}
              {e.status !== "resolved" && (
                <Button size="xs" onClick={() => update.mutate({ id: e.id, status: "resolved" })} data-testid={`admin-enquiry-resolve-btn-${e.id}`}>
                  Mark resolved
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
