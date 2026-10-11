import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useState } from "react";
import { CheckCircle2, Circle, FileText, GraduationCap, RefreshCcw, TrendingUp } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RESUME_BY_TRACK = [
  {
    icon: GraduationCap,
    title: "Freshers",
    points: [
      "Lead with education: degree, institution, graduation year and score.",
      "Give every academic or personal project two lines: what it does, what you built it with.",
      "List internships even if unpaid — outcomes, not duties.",
      "Add certifications and competitive-programming or GitHub links if the work is real.",
    ],
  },
  {
    icon: TrendingUp,
    title: "Non-IT to IT",
    points: [
      "Open with a two-line summary of your domain experience and the IT role you are targeting.",
      "Map transferable skills explicitly: process, stakeholders, data, quality, coordination.",
      "Show self-learned technical skills with honest proficiency levels and proof (projects, certifications).",
      "Never inflate titles or claim experience you do not have — switchers are screened on honesty.",
    ],
  },
  {
    icon: RefreshCcw,
    title: "Career gap candidates",
    points: [
      "State the break plainly and briefly — dates and a one-line reason are enough; details are yours to keep private.",
      "List what you did before the break with real achievements and scale.",
      "Add anything from the break that demonstrates skills: volunteering, freelance work, upskilling.",
      "Show current readiness: recent project work, refreshed certifications, availability.",
    ],
  },
  {
    icon: FileText,
    title: "Experienced professionals",
    points: [
      "Reverse-chronological roles with scope, stack and measurable outcomes.",
      "Quantify: users served, uptime improved, latency reduced, team size, budget.",
      "Keep notice period and availability current — it affects shortlisting.",
      "Two pages is a target, not a limit; cut anything a recruiter would skip.",
    ],
  },
];

const CHECKLIST = [
  "Contact details use a professional email address",
  "Resume file is named Firstname_Lastname_Role.pdf",
  "Every listed skill is something you can discuss in an interview",
  "Dates have no unexplained gaps you are not ready to discuss",
  "One page (fresher) / max two pages (experienced)",
  "Spell-check and read it aloud once",
];

export default function ResumeResources() {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  return (
    <div>
      <section className="bg-hero py-14 text-hero-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Career resources
          </p>
          <h1 className="mt-3 max-w-3xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="resources-headline">
            Resume &amp; career guidance that respects your real experience
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-hero-muted">
            Practical, honest guidance for every track — no paid courses required, no inflated claims.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2" data-testid="resources-track-guides">
          {RESUME_BY_TRACK.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="h-full p-6">
                <p className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900">
                  <t.icon className="h-5 w-5 text-amber-800" /> {t.title}
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
                  {t.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> {p}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-7" data-testid="resources-checklist">
            <h2 className="font-heading text-xl font-bold text-slate-900">Interview preparation checklist</h2>
            <p className="mt-1 text-sm text-slate-600">Work through these before every interview.</p>
            <ul className="mt-4 space-y-2">
              {CHECKLIST.map((item, i) => (
                <li key={item}>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                      checked.has(i) ? "border-amber-400 bg-amber-50 text-amber-950" : "border-slate-200 bg-white text-slate-700 hover:border-amber-400",
                    )}
                    onClick={() =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    data-testid={`resources-checklist-item-${i}`}
                  >
                    {checked.has(i) ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-700" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-5 lg:col-span-5">
            <Card className="p-6" data-testid="resources-tracks-card">
              <h2 className="font-heading text-xl font-bold text-slate-900">Your track, your plan</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {CATEGORIES.map((c) => (
                  <li key={c.key}>
                    <Link
                      to={`/candidates/${c.slug}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-slate-700 transition-colors hover:border-amber-500 hover:bg-amber-50"
                    >
                      {c.label}
                      <span className="font-mono text-[10px] uppercase text-slate-400">{c.badge}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h2 className="font-heading text-xl font-bold text-slate-900">Keep preparing</h2>
              <p className="mt-2 text-sm text-slate-600">
                Pair this guidance with our interview question library — answers, explanations and practice sets
                included.
              </p>
              <Link to="/interview-questions" className={buttonVariants({ className: "mt-4" })} data-testid="resources-questions-cta">
                Open the question library
              </Link>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
