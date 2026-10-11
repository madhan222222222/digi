import { CONTACT_CHANNELS } from "@/lib/contact";
import { Card } from "@/components/ui/card";

// Direct-contact channel buttons. We deliberately do not collect enquiries through a
// form — candidates and employers reach us on email, WhatsApp or Instagram instead.
export function ContactChannels({
  variant = "cards",
  testPrefix = "contact",
}: {
  variant?: "cards" | "row";
  testPrefix?: string;
}) {
  if (variant === "row") {
    return (
      <div className="flex flex-wrap gap-2.5" data-testid={`${testPrefix}-channel-row`}>
        {CONTACT_CHANNELS.map((c) => (
          <a
            key={c.key}
            href={c.href}
            target={c.external ? "_blank" : undefined}
            rel={c.external ? "noopener noreferrer" : undefined}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-amber-700 px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-amber-800 active:scale-[0.97]"
            data-testid={c.testId}
          >
            <c.icon className="h-4 w-4" /> {c.label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3" data-testid={`${testPrefix}-channels`}>
      {CONTACT_CHANNELS.map((c) => (
        <a
          key={c.key}
          href={c.href}
          target={c.external ? "_blank" : undefined}
          rel={c.external ? "noopener noreferrer" : undefined}
          className="block h-full transition-transform duration-150 active:scale-[0.98]"
          data-testid={c.testId}
        >
          <Card className="flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
              <c.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-heading text-base font-bold text-slate-900">{c.label}</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-amber-800">{c.value}</p>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600">{c.description}</p>
          </Card>
        </a>
      ))}
    </div>
  );
}
