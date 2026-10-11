import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  ClipboardList,
  FileText,
  GraduationCap,
  Search,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useSiteContent } from "@/lib/content";
import { CATEGORIES, QUESTION_CATEGORIES, TECH_LIST } from "@/lib/constants";
import type { Job, Paginated } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { StageRail } from "@/components/StageRail";
import { ContactChannels } from "@/components/ContactChannels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { BriefcaseBusiness, Layers, RefreshCw, Send, UserPlus } from "lucide-react";

const rise = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

const HOW_IT_WORKS = [
  { icon: UserPlus, title: "Register", text: "Create your candidate account in two minutes." },
  { icon: FileText, title: "Complete your profile", text: "Education, skills, experience — honest and complete." },
  { icon: Briefcase, title: "Explore openings", text: "Search verified openings matched to your track." },
  { icon: Send, title: "Apply", text: "One click per role; track everything in your dashboard." },
  { icon: UserCheck, title: "Attend interviews", text: "Interview schedules and updates arrive in your portal." },
  { icon: Sparkles, title: "Receive offer", text: "Offers are verified by our team when you submit them." },
  { icon: RefreshCw, title: "Service-charge terms, if any", text: "Complete applicable service-charge terms — never just for registering or applying." },
];

export default function Home() {
  const { text: announcement } = useSiteContent("announcement");
  const { text: contactInfo } = useSiteContent("contact_info");
  const navigate = useNavigate();
  const [questionQuery, setQuestionQuery] = useState("");

  // Non-blocking probe + real data for the "latest openings" rail.
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs", "home-latest"],
    queryFn: () => apiGet<Paginated<Job>>("/jobs?limit=6&sort=newest"),
    retry: false,
  });

  return (
    <div>
      {/* Announcement */}
      <div className="bg-amber-800 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm" data-testid="home-announcement">
        {announcement}
      </div>

      {/* Hero */}
      <section className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-start gap-12 lg:grid-cols-12">
            <motion.div {...rise} className="lg:col-span-7">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400" data-testid="hero-eyebrow">
                IT Recruitment &amp; Career Placement
              </p>
              <h1
                className="mt-4 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
                data-testid="hero-headline"
              >
                Your Experience. Your Potential.
                <span className="block text-amber-400">Your Next IT Career.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-hero-muted" data-testid="hero-subtitle">
                Discover career opportunities, prepare for interviews, and connect with relevant IT job openings
                through DigiPhonics Technology.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/jobs"
                  className="inline-flex h-11 items-center rounded-lg bg-amber-600 px-5 text-sm font-semibold text-hero transition-colors hover:bg-amber-500 active:scale-[0.98]"
                  data-testid="hero-explore-jobs-btn"
                >
                  Explore Job Openings <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20 active:scale-[0.98]"
                  data-testid="hero-register-btn"
                >
                  Talk to a Recruiter
                </Link>
                <Link
                  to="/employer"
                  className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20 active:scale-[0.98]"
                  data-testid="hero-post-job-btn"
                >
                  Employer: Post a Job
                </Link>
                <Link
                  to="/interview-questions"
                  className="inline-flex h-11 items-center rounded-lg px-5 text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300"
                  data-testid="hero-questions-btn"
                >
                  Explore Interview Questions
                </Link>
              </div>

              {/* Track quick-filters */}
              <div className="mt-10 grid gap-3 sm:grid-cols-2" data-testid="hero-track-filters">
                {CATEGORIES.map((c) => (
                  <Link
                    key={c.key}
                    to={`/candidates/${c.slug}`}
                    className="group rounded-xl border border-hero-border bg-hero-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-600/40"
                    data-testid={`candidate-track-${c.slug}-card`}
                  >
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400">{c.badge}</span>
                    <p className="mt-1 font-heading text-sm font-bold text-white">{c.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-hero-muted">{c.tagline}</p>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Right rail: pipeline preview + search card */}
            <motion.div {...rise} className="space-y-4 lg:col-span-5">
              <div className="rounded-2xl border border-hero-border bg-hero-card p-6" data-testid="hero-tracking-card">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Application tracking, built in
                </p>
                <div className="mt-4 rounded-xl bg-hero p-4">
                  <StageRail current="interview_scheduled" testPrefix="hero-stage-rail" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-hero-muted">
                  Every application moves through a visible pipeline — Applied, Under Review, Shortlisted, Interview,
                  Offer, Joined — with notifications at each step.
                </p>
              </div>
              <div className="rounded-2xl border border-hero-border bg-hero-card p-6" data-testid="hero-latest-jobs-card">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                    {jobsData ? `${jobsData.total} live opening${jobsData.total === 1 ? "" : "s"}` : "Latest openings"}
                  </p>
                  <Link to="/jobs" className="text-xs font-semibold text-amber-400 hover:text-amber-300">
                    View all <ArrowRight className="inline h-3 w-3" />
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {jobsLoading && <p className="py-4 text-sm text-hero-muted">Loading openings…</p>}
                  {!jobsLoading && (jobsData?.items.length ?? 0) === 0 && (
                    <p className="py-4 text-sm text-hero-muted" data-testid="hero-no-jobs-note">
                      New openings are published here as soon as they clear review.
                    </p>
                  )}
                  {jobsData?.items.slice(0, 3).map((job) => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="block rounded-lg border border-hero-border bg-hero px-3 py-2 transition-colors hover:border-amber-600/40"
                      data-testid={`hero-job-ticker-${job.id}`}
                    >
                      <span className="block truncate text-sm font-semibold text-white">{job.title}</span>
                      <span className="block truncate text-xs text-hero-muted">
                        {job.company_name} · {job.location || "—"} · {job.work_mode}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Candidate categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="home-categories-section">
        <motion.div {...rise}>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Candidate tracks</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
              A track for every starting point
            </h2>
          </div>
        </motion.div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c, i) => (
            <motion.div key={c.key} {...rise} transition={{ ...rise.transition, delay: i * 0.05 }}>
              <Link to={`/candidates/${c.slug}`} className="block h-full" data-testid={`home-category-${c.slug}`}>
                <Card className="flex h-full flex-col p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                  <span className={`inline-flex w-fit rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${c.badgeClass}`}>
                    {c.badge}
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-bold text-slate-900">{c.label}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{c.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-800">
                    Explore track <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Latest openings */}
      <section className="border-y border-slate-200 bg-white py-16" data-testid="home-latest-jobs-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...rise} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Job openings</p>
              <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900">Latest openings</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Only openings that have cleared our employer and vacancy review are listed here.
              </p>
            </div>
            <Link to="/jobs" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50" data-testid="home-view-all-jobs-btn">
              Browse all openings
            </Link>
          </motion.div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {jobsLoading &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
              ))}
            {!jobsLoading && (jobsData?.items.length ?? 0) === 0 && (
              <div className="lg:col-span-2">
                <EmptyState
                  icon={Briefcase}
                  title="No openings published yet"
                  description="Real openings appear here the moment they clear review. Employers can submit vacancies from the Employer page."
                  testId="home-latest-jobs-empty"
                />
              </div>
            )}
            {jobsData?.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </section>

      {/* Browse by technology */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="home-tech-section">
        <motion.div {...rise}>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">By technology</p>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900">Browse jobs by technology</h2>
        </motion.div>
        <motion.div {...rise} className="mt-6 flex flex-wrap gap-2.5">
          {TECH_LIST.map((tech) => (
            <Link
              key={tech}
              to={`/jobs?tech=${encodeURIComponent(tech)}`}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-amber-600/50 hover:bg-amber-50 hover:text-amber-900 active:scale-[0.98]"
              data-testid={`home-tech-chip-${tech.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              {tech}
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Career resources + question search */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8" data-testid="home-resources-section">
          <motion.div {...rise}>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Career resources</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900">
              Resume guidance &amp; honest preparation
            </h2>
            <div className="mt-6 space-y-3">
              {[
                { icon: FileText, to: "/resume-resources", title: "Resume & career resources", text: "Structure your resume the way recruiters screen it — for freshers, switchers, gap returners and experienced engineers." },
                { icon: ClipboardList, to: "/interview-questions", title: "Interview question library", text: `Searchable questions across ${QUESTION_CATEGORIES.length} categories with answers, explanations and practice sets.` },
                { icon: Target, to: "/jobs", title: "Filtered job search", text: "Filter openings by your track, experience, work mode and technology." },
              ].map((r) => (
                <Link key={r.to} to={r.to} className="flex gap-4 rounded-xl border border-slate-200 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm" data-testid={`home-resource-${r.to.replace(/\//g, "-")}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-heading text-sm font-bold text-slate-900">{r.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{r.text}</span>
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
          <motion.div {...rise}>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Interview preparation</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900">
              Search technical interview questions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Browse without an account. Registered candidates can bookmark questions and generate randomized
              practice sets.
            </p>
            <form
              className="mt-5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/interview-questions${questionQuery ? `?q=${encodeURIComponent(questionQuery)}` : ""}`);
              }}
            >
              <Input
                value={questionQuery}
                onChange={(e) => setQuestionQuery(e.target.value)}
                placeholder="Try “decorators”, “joins”, “career break”…"
                data-testid="home-question-search-input"
              />
              <Button type="submit" data-testid="home-question-search-btn">
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Python", "SQL & DBMS", "Machine Learning", "HR Interview Questions", "Career Gap Interview Questions"].map((t) => (
                <Link
                  key={t}
                  to={`/interview-questions?category=${encodeURIComponent(t)}`}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-amber-50 hover:text-amber-900"
                  data-testid={`home-question-tag-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="home-how-it-works">
        <motion.div {...rise}>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">The process</p>
          <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900">How DigiPhonics works</h2>
        </motion.div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div key={step.title} {...rise} transition={{ ...rise.transition, delay: i * 0.04 }}>
              <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-700/10 font-heading text-sm font-extrabold text-amber-800">
                  {i + 1}
                </span>
                <step.icon className="mt-3 h-4 w-4 text-slate-400" />
                <p className="mt-2 font-heading text-sm font-bold text-slate-900">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Employer band */}
      <section className="bg-hero py-16 text-hero-foreground" data-testid="home-employer-section">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <motion.div {...rise}>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">For employers</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-white">
              Hiring? Submit your vacancy once. We handle the review.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hero-muted">
              Post your requirement with role details, skills and compensation. Our team reviews the company and
              vacancy information before anything goes public — and you keep control of your listing.
            </p>
          </motion.div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/employer"
              className="inline-flex h-11 items-center rounded-lg bg-amber-600 px-5 text-sm font-semibold text-hero transition-colors hover:bg-amber-500 active:scale-[0.98]"
              data-testid="home-employer-post-job-btn"
            >
              <BriefcaseBusiness className="mr-2 h-4 w-4" /> Post a Job
            </Link>
            <Link
              to="/contact"
              className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20"
              data-testid="home-employer-contact-btn"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="home-contact-section">
        <div className="grid gap-10 lg:grid-cols-12">
          <motion.div {...rise} className="lg:col-span-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Contact</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-900">Reach us directly</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{contactInfo}</p>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <GraduationCap className="h-4 w-4 text-amber-800" /> What we are not
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                DigiPhonics Technology is not a training institute. We do not sell courses, and no fee applies just
                for registering, uploading a resume, applying, or receiving an offer letter.
              </p>
            </div>
          </motion.div>
          <motion.div {...rise} className="lg:col-span-7">
            <ContactChannels testPrefix="home" />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
