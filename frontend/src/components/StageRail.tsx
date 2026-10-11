import { Check } from "lucide-react";
import { APPLICATION_STAGE_ORDER, APPLICATION_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

// Linear application pipeline: Applied → … → Offer Received → Joined.
// Active node pulses teal, passed nodes show a check, upcoming are slate dots.
export function StageRail({
  current,
  testPrefix = "stage-rail",
}: {
  current: string | null;
  testPrefix?: string;
}) {
  const keys = APPLICATION_STAGE_ORDER as readonly string[];
  const activeIdx = current ? keys.indexOf(current) : -1;
  const isBadTerminal = current === "not_selected" || current === "closed";

  return (
    <div data-testid={testPrefix}>
      <ol className="flex flex-wrap items-center gap-x-0 gap-y-3">
        {keys.map((key, i) => {
          const done = activeIdx >= 0 && i < activeIdx;
          const active = current === key;
          return (
            <li key={key} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                    active
                      ? "animate-stage-pulse border-teal-600 bg-teal-600 text-white"
                      : done
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-slate-300 bg-white text-slate-400",
                  )}
                  data-testid={`${testPrefix}-node-${key}`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "max-w-[86px] text-center font-mono text-[9px] uppercase leading-tight tracking-wide",
                    active ? "font-bold text-teal-700" : done ? "text-green-700" : "text-slate-400",
                  )}
                >
                  {APPLICATION_STATUS_LABELS[key]}
                </span>
              </div>
              {i < keys.length - 1 && (
                <span className={cn("mx-1 h-0.5 w-6 sm:w-10", done ? "bg-green-500" : "bg-slate-200")} />
              )}
            </li>
          );
        })}
      </ol>
      {isBadTerminal && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-red-600" data-testid={`${testPrefix}-terminal-note`}>
          {APPLICATION_STATUS_LABELS[current as string]} — you can still apply to other openings
        </p>
      )}
    </div>
  );
}
