import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Job } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";

export default function SavedJobs() {
  const { data, isLoading } = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: () => apiGet<Job[]>("/jobs/saved"),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="saved-jobs-headline">
          Saved jobs
        </h1>
        <p className="mt-1 text-sm text-slate-600">Openings you bookmarked for later.</p>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={Bookmark}
          title="No saved jobs"
          description="Tap the bookmark icon on any opening to keep it here."
          action={
            <Link to="/jobs" className={buttonVariants({ size: "sm" })} data-testid="saved-jobs-browse-btn">
              Browse openings
            </Link>
          }
          testId="saved-jobs-empty-state"
        />
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {data?.map((job) => (
          <JobCard key={job.id} job={job} saved />
        ))}
      </div>
    </div>
  );
}
