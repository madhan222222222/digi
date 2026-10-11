import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        data-testid="pagination-prev-btn"
      >
        <ChevronLeft className="h-4 w-4" /> Prev
      </Button>
      <span className="font-mono text-sm text-slate-600" data-testid="pagination-status">
        Page {page} of {pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        data-testid="pagination-next-btn"
      >
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
