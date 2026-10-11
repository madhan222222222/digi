import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Briefcase, ClipboardList, UserPlus } from "lucide-react";
import { categoryBySlug } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CandidateCategory() {
  const { slug } = useParams();
  const meta = categoryBySlug(slug);
  if (!meta) return <Navigate to="/" replace />;

  const honestyNote =
    meta.key === "career_gap"
      ? "Career-gap information is treated respectfully and confidentially, and is never used to auto-reject a profile. You choose what to share."
      : meta.key === "non_it_to_it"
        ? "We will never ask you to enroll in training to switch careers. Present your previous experience honestly — that is exactly what employers on this track are looking for."
        : meta.key === "experienced"
          ? "Your current and expected salary are optional. You control what is visible, and your notice period is honoured in matching."
          : "No prior work experience required — your education, projects and certifications are what we present.";

  return (
    <div>
      {/* Hero band */}
      <section className="bg-hero py-14 text-hero-foreground lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className={`inline-flex rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}>
              {meta.badge}
            </span>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="category-headline">
              {meta.label}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-amber-400">{meta.tagline}</p>
            <p className="mt-4 max-w-3xl leading-relaxed text-hero-muted">{meta.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={`/register?category=${meta.key}`}
                className="inline-flex h-11 items-center rounded-lg bg-amber-600 px-5 text-sm font-semibold text-hero transition-colors hover:bg-amber-500 active:scale-[0.98]"
                data-testid="category-register-btn"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Register as {meta.label.replace(" Candidates", "")}
              </Link>
              <Link
                to={`/jobs?category=${meta.key}`}
                className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20"
                data-testid="category-browse-jobs-btn"
              >
                <Briefcase className="mr-2 h-4 w-4" /> Browse openings for this track
              </Link>
              <Link
                to="/interview-questions"
                className="inline-flex h-11 items-center rounded-lg px-5 text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300"
                data-testid="category-questions-btn"
              >
                <ClipboardList className="mr-2 h-4 w-4" /> Interview preparation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900">What you can do on this track</h2>
            <ul className="mt-5 space-y-3" data-testid="category-highlights">
              {meta.highlights.map((h, i) => (
                <motion.li
                  key={h}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700"
                >
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  {h}
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="space-y-5 lg:col-span-5">
            <Card className="p-6" data-testid="category-profile-card">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">Your profile</p>
              <h3 className="mt-2 font-heading text-base font-bold text-slate-900">What we ask from you</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{meta.profileFieldsNote}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Ideal for: {meta.idealFor}
              </p>
            </Card>
            <Card className="p-6" data-testid="category-honesty-card">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">Our commitment</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{honestyNote}</p>
            </Card>
            <Card className="p-6" data-testid="category-change-note">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">Flexible by design</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                You can change your candidate category later from your profile — your history, applications and
                documents stay with you.
              </p>
              <Link to="/register" className={buttonVariants({ variant: "link", size: "sm", className: "mt-2 px-0" })}>
                Create your profile <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
