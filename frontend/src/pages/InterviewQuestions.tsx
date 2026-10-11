import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, ChevronDown, ClipboardList, Search, Shuffle } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { useMe } from "@/lib/session";
import { QUESTION_CATEGORY_GROUPS } from "@/lib/constants";
import type { Paginated, Question } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

function QuestionCard({
  q,
  bookmarked,
  defaultOpen = false,
}: {
  q: Question;
  bookmarked: boolean;
  defaultOpen?: boolean;
}) {
  const { data: me } = useMe();
  const isCandidate = me?.user?.role === "candidate";
  const qc = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [mcqPick, setMcqPick] = useState<string | null>(null);

  const bookmarkMut = useMutation({
    mutationFn: async () =>
      bookmarked ? apiDelete(`/questions/${q.id}/bookmark`) : apiPost(`/questions/${q.id}/bookmark`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["question-bookmarks"] });
      toast.success(bookmarked ? "Bookmark removed" : "Bookmarked");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  return (
    <Card size="sm" className="p-5" data-testid={`question-card-${q.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase">{q.category}</Badge>
            <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${DIFFICULTY_STYLES[q.difficulty] ?? ""}`}>
              {q.difficulty}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400">{q.question_type}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-relaxed text-slate-900" data-testid={`question-text-${q.id}`}>
            {q.question}
          </h3>
        </div>
        {isCandidate && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => bookmarkMut.mutate()}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
            data-testid={`question-bookmark-btn-${q.id}`}
          >
            {bookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-teal-600" />
            ) : (
              <Bookmark className="h-4 w-4 text-slate-400" />
            )}
          </Button>
        )}
      </div>

      {q.options.length > 0 && (
        <div className="mt-3 space-y-1.5" data-testid={`question-options-${q.id}`}>
          {q.options.map((opt, i) => {
            const picked = mcqPick === opt;
            const isAnswer = q.answer != null && opt === q.answer;
            return (
              <button
                key={i}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  picked
                    ? isAnswer
                      ? "border-green-300 bg-green-50 text-green-800"
                      : "border-red-300 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-400",
                )}
                onClick={() => setMcqPick(opt)}
                data-testid={`question-option-${q.id}-${i}`}
              >
                <span className="font-mono font-bold">{String.fromCharCode(65 + i)}</span> {opt}
              </button>
            );
          })}
          {mcqPick && q.answer && (
            <p className="pt-1 text-xs font-semibold text-green-700" data-testid={`question-mcq-result-${q.id}`}>
              {mcqPick === q.answer ? "Correct!" : `Correct answer: ${q.answer}`}
            </p>
          )}
        </div>
      )}

      <button
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
        onClick={() => setOpen(!open)}
        data-testid={`question-toggle-answer-${q.id}`}
      >
        {open ? "Hide answer" : "Show answer & explanation"}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4" data-testid={`question-answer-${q.id}`}>
          {q.answer && (
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">Answer</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{q.answer}</p>
            </div>
          )}
          {q.explanation && (
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">Explanation</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{q.explanation}</p>
            </div>
          )}
          {q.example && (
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">Example</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-hero p-3 font-mono text-[11px] leading-relaxed text-teal-100">
                {q.example}
              </pre>
            </div>
          )}
        </div>
      )}

      {q.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {q.tags.map((t) => (
            <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              #{t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function InterviewQuestions() {
  const [params, setParams] = useSearchParams();
  const get = (key: string) => params.get(key) ?? "";
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "any") next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const { data: me } = useMe();
  const isCandidate = me?.user?.role === "candidate";

  const { data, isLoading } = useQuery({
    queryKey: ["questions", params.toString()],
    queryFn: () => apiGet<Paginated<Question>>(`/questions?${params.toString()}`),
    placeholderData: (prev) => prev,
    retry: false,
  });

  const { data: categoryCounts } = useQuery({
    queryKey: ["question-categories"],
    queryFn: () => apiGet<{ category: string; count: number }[]>("/questions/categories"),
    retry: false,
  });
  const countMap = useMemo(
    () => new Map((categoryCounts ?? []).map((c) => [c.category, c.count])),
    [categoryCounts],
  );

  const { data: bookmarks } = useQuery({
    queryKey: ["question-bookmarks"],
    queryFn: () => apiGet<Question[]>("/questions/bookmarks"),
    enabled: !!isCandidate,
    retry: false,
  });
  const bookmarkIds = useMemo(() => new Set((bookmarks ?? []).map((q) => q.id)), [bookmarks]);

  const [searchDraft, setSearchDraft] = useState(get("q"));

  // Practice set
  const [practice, setPractice] = useState<Question[] | null>(null);
  const [practiceBusy, setPracticeBusy] = useState(false);
  async function generatePractice() {
    setPracticeBusy(true);
    try {
      const qs = new URLSearchParams();
      if (get("category")) qs.set("category", get("category"));
      if (get("difficulty")) qs.set("difficulty", get("difficulty"));
      qs.set("count", "5");
      setPractice(await apiGet<Question[]>(`/questions/practice?${qs.toString()}`));
    } catch (err) {
      toast.error(apiErrorText(err, "Could not generate a practice set"));
    } finally {
      setPracticeBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
        Interview questions
      </p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900" data-testid="questions-headline">
        Prepare with real, quality-controlled questions
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Browse without an account. Registered candidates can bookmark questions and build randomized practice sets.
        Questions are original DigiPhonics content — not copied from any company's confidential interview files.
      </p>

      {/* Search + filters */}
      <div className="mt-6 flex flex-wrap gap-2" data-testid="questions-filter-bar">
        <form
          className="flex min-w-64 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", searchDraft);
          }}
        >
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search questions, topics, tags…"
            data-testid="questions-search-input"
          />
          <Button type="submit" data-testid="questions-search-btn">
            <Search className="h-4 w-4" /> Search
          </Button>
        </form>
        <Select value={get("category") || "any"} onValueChange={(v: string) => setFilter("category", v)}>
          <SelectTrigger className="w-56" data-testid="questions-category-select">
            <SelectValue>{(v: string) => (v === "any" ? "All categories" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="any">All categories</SelectItem>
            {QUESTION_CATEGORY_GROUPS.flatMap((g) => g.items).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={get("difficulty") || "any"} onValueChange={(v: string) => setFilter("difficulty", v)}>
          <SelectTrigger className="w-40" data-testid="questions-difficulty-select">
            <SelectValue>{(v: string) => (v === "any" ? "Any difficulty" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any difficulty</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Results */}
        <div className="space-y-4 lg:col-span-8">
          <p className="text-sm text-slate-600" data-testid="questions-results-count">
            {isLoading ? "Loading questions…" : `${data?.total ?? 0} question${(data?.total ?? 0) === 1 ? "" : "s"}`}
          </p>
          {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
          {!isLoading && (data?.items.length ?? 0) === 0 && (
            <EmptyState
              icon={ClipboardList}
              title="No questions match your search"
              description="Try a different keyword or clear the filters."
              testId="questions-empty-state"
            />
          )}
          {data?.items.map((q) => (
            <QuestionCard key={q.id} q={q} bookmarked={bookmarkIds.has(q.id)} />
          ))}
          {data && <Pagination page={data.page} pages={data.pages} onPage={(p) => setFilter("page", String(p))} />}
        </div>

        {/* Side rail: practice + categories */}
        <div className="space-y-5 lg:col-span-4">
          <Card className="p-5" data-testid="practice-panel">
            <p className="flex items-center gap-2 font-heading text-base font-bold text-slate-900">
              <Shuffle className="h-4 w-4 text-teal-700" /> Randomized practice set
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Five random questions{get("category") ? ` from ${get("category")}` : ""} with answers revealed one at a
              time.
            </p>
            <Button className="mt-3 w-full" onClick={generatePractice} disabled={practiceBusy} data-testid="practice-generate-btn">
              {practiceBusy ? "Building…" : "Generate practice set"}
            </Button>
            {practice && (
              <div className="mt-4 space-y-3" data-testid="practice-set">
                {practice.map((q, i) => (
                  <QuestionCard key={q.id} q={q} bookmarked={bookmarkIds.has(q.id)} />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5" data-testid="questions-categories-panel">
            <Label className="font-heading text-base font-bold text-slate-900">Browse categories</Label>
            <div className="mt-3 space-y-4">
              {QUESTION_CATEGORY_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                    {group.group}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {group.items.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                          get("category") === c
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50",
                        )}
                        onClick={() => setFilter("category", c)}
                        data-testid={`questions-category-chip-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        {c}
                        {countMap.has(c) ? ` (${countMap.get(c)})` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
