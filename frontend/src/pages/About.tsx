import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Briefcase, ClipboardList, ShieldCheck, Users } from "lucide-react";
import { useSiteContent } from "@/lib/content";
import { CATEGORIES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

function paragraphs(text: string): string[] {
  return text.split(/\n+/).filter(Boolean);
}

export default function About() {
  const about = useSiteContent("about");
  const services = useSiteContent("services");
  const careerSupport = useSiteContent("career_support");
  const employerSolutions = useSiteContent("employer_solutions");

  return (
    <div>
      <section className="bg-hero py-16 text-hero-foreground lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">About us</p>
            <h1 className="mt-3 max-w-3xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="about-headline">
              Recruitment that starts with real experience — not courses.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-hero-muted">
              DigiPhonics Technology is an IT recruitment and career placement company.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="about-body">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900">About DigiPhonics Technology</h2>
            <div className="mt-4 space-y-4">
              {paragraphs(about.text).map((p, i) => (
                <p key={i} className="leading-relaxed text-slate-700">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <Card className="p-6" data-testid="about-positioning-card">
              <p className="font-heading text-base font-bold text-slate-900">What we are — and are not</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex gap-2 text-slate-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                  We are a recruitment and placement company connecting candidates with reviewed IT openings.
                </li>
                <li className="flex gap-2 text-slate-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                  We publish verified status only after completing employer and vacancy checks — never merely
                  because a website or document was supplied.
                </li>
                <li className="flex gap-2 text-slate-700">
                  <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                  We are not a training institute: no courses, no batches, no enrollment fees.
                </li>
                <li className="flex gap-2 text-slate-700">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                  We never guarantee an offer, and no fee applies merely for registering, applying or receiving an
                  offer letter.
                </li>
              </ul>
            </Card>
          </div>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2" data-testid="about-services">
          <Card className="p-6">
            <h3 className="font-heading text-lg font-bold text-slate-900">Our recruitment services</h3>
            <div className="mt-3 space-y-3">
              {paragraphs(services.text).map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-600">
                  {p}
                </p>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-heading text-lg font-bold text-slate-900">Candidate career support</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{careerSupport.text}</p>
          </Card>
          <Card className="p-6">
            <h3 className="font-heading text-lg font-bold text-slate-900">Employer solutions</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{employerSolutions.text}</p>
            <Link to="/employer" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })} data-testid="about-employer-cta">
              <Briefcase className="h-4 w-4" /> Post a job
            </Link>
          </Card>
          <Card className="p-6" data-testid="about-tracks-card">
            <h3 className="font-heading text-lg font-bold text-slate-900">Four candidate tracks</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.key}>
                  <Link to={`/candidates/${c.slug}`} className="group flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:border-amber-600/40 hover:bg-amber-50">
                    <span className="font-medium text-slate-800">{c.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">{c.badge}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
}
