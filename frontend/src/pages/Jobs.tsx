import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from "@/lib/format";
import type { Job, Paginated } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EXPERIENCE_OPTIONS = [
  { value: "any", label: "Any experience" },
  { value: "0", label: "0 yrs (entry level)" },
  { value: "1", label: "1+ yrs" },
  { value: "2", label: "2+ yrs" },
  { value: "3", label: "3+ yrs" },
  { value: "5", label: "5+ yrs" },
];

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "any") next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const qs = params.toString();
  const page = Math.max(1, parseInt(get("page") || "1", 10) || 1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["jobs", qs],
    queryFn: () => apiGet<Paginated<Job>>(`/jobs?${qs}`),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const { data: me } = useMe();
  const isCandidate = me?.user?.role === "candidate";
  const { data: savedJobs } = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: () => apiGet<Job[]>("/jobs/saved"),
    enabled: !!isCandidate,
    retry: false,
  });
  const savedIds = useMemo(() => new Set((savedJobs ?? []).map((j) => j.id)), [savedJobs]);

  const activeFilters = ["q", "category", "work_mode", "employment_type", "tech", "experience", "location"].filter(
    (k) => get(k),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Job openings</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900" data-testid="jobs-headline">
        Find your next IT role
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Every opening here has cleared our employer and vacancy review. Closed and expired jobs are hidden
        automatically.
      </p>

      {/* Search bar */}
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setFilter("q", String(fd.get("q") ?? ""));
        }}
      >
        <Input
          name="q"
          defaultValue={get("q")}
          placeholder="Search by company, role, technology or keyword…"
          data-testid="job-search-input"
        />
        <Button type="submit" data-testid="job-search-btn">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Facet rail */}
        <aside className="lg:col-span-3" data-testid="jobs-filter-rail">
          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
            <div className="space-y-1.5">
              <Label>Candidate track</Label>
              <Select value={get("category") || "any"} onValueChange={(v: string) => setFilter("category", v)}>
                <SelectTrigger data-testid="jobs-filter-category">
                  <SelectValue>{(v: string) => CATEGORIES.find((c) => c.key === v)?.label ?? "All tracks"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All tracks</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Experience</Label>
              <Select value={get("experience") || "any"} onValueChange={(v: string) => setFilter("experience", v)}>
                <SelectTrigger data-testid="jobs-filter-experience">
                  <SelectValue>{(v: string) => EXPERIENCE_OPTIONS.find((o) => o.value === v)?.label ?? "Any"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Work mode</Label>
              <Select value={get("work_mode") || "any"} onValueChange={(v: string) => setFilter("work_mode", v)}>
                <SelectTrigger data-testid="jobs-filter-work-mode">
                  <SelectValue>{(v: string) => WORK_MODE_LABELS[v] ?? "Any"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {Object.entries(WORK_MODE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employment type</Label>
              <Select value={get("employment_type") || "any"} onValueChange={(v: string) => setFilter("employment_type", v)}>
                <SelectTrigger data-testid="jobs-filter-employment-type">
                  <SelectValue>{(v: string) => EMPLOYMENT_TYPE_LABELS[v] ?? "Any"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobs-filter-location-input">Location</Label>
              <Input
                id="jobs-filter-location-input"
                defaultValue={get("location")}
                placeholder="e.g. Bengaluru"
                onBlur={(e) => setFilter("location", e.target.value)}
                data-testid="jobs-filter-location"
              />
            </div>
            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="w-full"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
                data-testid="jobs-clear-filters-btn"
              >
                <X className="h-3.5 w-3.5" /> Clear all filters
              </Button>
            )}
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600" data-testid="jobs-results-count">
              {isLoading ? "Loading openings…" : `${data?.total ?? 0} opening${(data?.total ?? 0) === 1 ? "" : "s"} found`}
            </p>
            <Select value={get("sort") || "newest"} onValueChange={(v: string) => setFilter("sort", v)}>
              <SelectTrigger className="w-44" data-testid="jobs-sort-select">
                <SelectValue>{(v: string) => (v === "relevance" ? "Sort: Relevance" : "Sort: Newest")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Sort: Newest</SelectItem>
                <SelectItem value="relevance">Sort: Relevance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-4">
            {isLoading &&
              [0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
            {!isLoading && isError && (
              <EmptyState
                title="Could not load openings"
                description="The jobs service did not respond. Please try again shortly."
                testId="jobs-error-state"
              />
            )}
            {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
              <EmptyState
                icon={Search}
                title="No openings match your filters"
                description="Try clearing a filter or searching for a different technology. New openings appear as soon as they clear review."
                testId="jobs-empty-state"
              />
            )}
            {data?.items.map((job) => (
              <JobCard key={job.id} job={job} saved={savedIds.has(job.id)} />
            ))}
          </div>

          {data && <Pagination page={page} pages={data.pages} onPage={(p) => setFilter("page", String(p))} />}
        </div>
      </div>
    </div>
  );
}
