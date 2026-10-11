import { useSiteContent } from "@/lib/content";

const TITLES: Record<string, { title: string; eyebrow: string }> = {
  privacy: { title: "Privacy Policy", eyebrow: "Your data, your control" },
  terms: { title: "Terms & Conditions", eyebrow: "Using this platform" },
  service_agreement: { title: "Candidate Service Agreement", eyebrow: "Fees only under written consent" },
  refund_policy: { title: "Refund & Cancellation Policy", eyebrow: "Fair, documented, reviewable" },
};

export default function LegalPage({ pageKey }: { pageKey: string }) {
  const { text } = useSiteContent(pageKey);
  const meta = TITLES[pageKey] ?? { title: pageKey, eyebrow: "Policy" };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">{meta.eyebrow}</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" data-testid="legal-title">
        {meta.title}
      </h1>
      <div className="mt-8 space-y-4" data-testid="legal-body">
        {text
          .split(/\n+/)
          .filter(Boolean)
          .map((p, i) => (
            <p key={i} className="leading-relaxed text-slate-700">
              {p}
            </p>
          ))}
      </div>
      <p className="mt-10 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
        This page is managed by DigiPhonics Technology and may be updated from time to time. The version in force at
        the time of your action applies. Have the fee model and candidate agreement reviewed for applicable Indian
        laws before launch.
      </p>
    </div>
  );
}
