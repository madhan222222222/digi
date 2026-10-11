import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2, Upload } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import { QUESTION_CATEGORY_GROUPS } from "@/lib/constants";
import type { Paginated, Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";

const ALL_CATEGORIES = QUESTION_CATEGORY_GROUPS.flatMap((g) => g.items);
const EMPTY = {
  question: "",
  category: ALL_CATEGORIES[0],
  topic: "",
  difficulty: "medium",
  question_type: "conceptual",
  answer: "",
  explanation: "",
  example: "",
  options: "",
  tags: "",
  published: true,
};

export default function AdminQuestions() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: { row: number; error: string }[] } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", page, search],
    queryFn: () => apiGet<Paginated<Question>>(`/admin/questions?page=${page}&limit=15${search ? `&q=${encodeURIComponent(search)}` : ""}`),
    retry: false,
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost<Question>("/admin/questions", {
        question: form.question,
        category: form.category,
        topic: form.topic || null,
        difficulty: form.difficulty,
        question_type: form.question_type,
        answer: form.answer || null,
        explanation: form.explanation || null,
        example: form.example || null,
        options: form.options.split("|").map((o) => o.trim()).filter(Boolean),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        published: form.published,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Question added");
      setForm({ ...EMPTY });
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorText(err, "Could not add the question")),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      apiPut(`/admin/questions/${id}`, { published }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success("Publication status updated");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/questions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success("Question deleted");
    },
    onError: (err) => toast.error(apiErrorText(err)),
  });

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await apiUpload<{ imported: number; errors: { row: number; error: string }[] }>("/admin/questions/import", fd);
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      toast.success(`${result.imported} question(s) imported${result.errors.length ? `, ${result.errors.length} row(s) skipped` : ""}`);
    } catch (err) {
      toast.error(apiErrorText(err, "CSV import failed"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900" data-testid="admin-questions-headline">
            Interview question bank
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Publish original, quality-controlled content. Never label generated questions as a named company's actual
            interview questions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} data-testid="admin-questions-csv-input" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} data-testid="admin-questions-import-btn">
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              className="inline-flex h-9 items-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800"
              data-testid="admin-questions-add-btn"
            >
              <Plus className="mr-1 h-4 w-4" /> Add question
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add an interview question</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="q-question">Question *</Label>
                  <Textarea id="q-question" rows={2} required data-testid="admin-question-text-input" {...field("question")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category *</Label>
                    <Select value={form.category} onValueChange={(v: string) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger data-testid="admin-question-category-select">
                        <SelectValue>{(v: string) => v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {ALL_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="q-topic">Topic</Label>
                    <Input id="q-topic" data-testid="admin-question-topic-input" {...field("topic")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v: string) => setForm((f) => ({ ...f, difficulty: v }))}>
                      <SelectTrigger data-testid="admin-question-difficulty-select">
                        <SelectValue>{(v: string) => v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {["easy", "medium", "hard"].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Question type</Label>
                    <Select value={form.question_type} onValueChange={(v: string) => setForm((f) => ({ ...f, question_type: v }))}>
                      <SelectTrigger data-testid="admin-question-type-select">
                        <SelectValue>{(v: string) => v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {["conceptual", "coding", "mcq", "behavioral"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-answer">Answer</Label>
                  <Textarea id="q-answer" rows={2} data-testid="admin-question-answer-input" {...field("answer")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-expl">Detailed explanation</Label>
                  <Textarea id="q-expl" rows={3} data-testid="admin-question-explanation-input" {...field("explanation")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-example">Example / code</Label>
                  <Textarea id="q-example" rows={3} className="font-mono text-xs" data-testid="admin-question-example-input" {...field("example")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="q-options">MCQ options (pipe separated)</Label>
                    <Input id="q-options" placeholder="A | B | C | D" data-testid="admin-question-options-input" {...field("options")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="q-tags">Tags (comma separated)</Label>
                    <Input id="q-tags" data-testid="admin-question-tags-input" {...field("tags")} />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Checkbox checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: !!v }))} data-testid="admin-question-published-checkbox" />
                  Publish immediately
                </label>
                <Button type="submit" className="w-full" disabled={create.isPending} data-testid="admin-question-save-btn">
                  {create.isPending ? "Saving…" : "Add question"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">CSV columns</p>
        <p className="mt-1 font-mono text-xs text-slate-600">
          question, category, topic, difficulty (easy|medium|hard), question_type (conceptual|coding|mcq|behavioral),
          answer, explanation, example, options (pipe separated), tags (pipe separated), published (true|false)
        </p>
        {importResult && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs" data-testid="admin-questions-import-result">
            <p className="font-semibold text-slate-800">Imported {importResult.imported} question(s).</p>
            {importResult.errors.slice(0, 8).map((e) => (
              <p key={e.row} className="text-red-600">Row {e.row}: {e.error}</p>
            ))}
          </div>
        )}
      </Card>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setSearch(String(fd.get("q") ?? ""));
          setPage(1);
        }}
      >
        <Input name="q" defaultValue={search} placeholder="Search questions…" data-testid="admin-questions-search-input" />
        <Button type="submit" data-testid="admin-questions-search-btn">Search</Button>
      </form>

      {isLoading && <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />}
      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No questions yet"
          description="Add questions one at a time or import a validated CSV."
          testId="admin-questions-empty"
        />
      )}

      <div className="space-y-3">
        {data?.items.map((q) => (
          <Card key={q.id} className="p-5" data-testid={`admin-question-row-${q.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wide text-slate-400">
                  {q.category} · {q.difficulty} · {q.question_type}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">{q.question}</p>
                {q.answer && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{q.answer}</p>}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                  <Checkbox
                    checked={q.published}
                    onCheckedChange={(v) => togglePublish.mutate({ id: q.id, published: !!v })}
                    data-testid={`admin-question-publish-toggle-${q.id}`}
                  />
                  Published
                </label>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove.mutate(q.id)}
                  aria-label="Delete question"
                  data-testid={`admin-question-delete-btn-${q.id}`}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {data && <Pagination page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}
