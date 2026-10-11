import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ChevronDown, Instagram, LayoutDashboard, LogOut, Mail, Menu, MessageCircle } from "lucide-react";
import { useMe, endSession, homeForRole } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import { CONTACT_EMAIL, INSTAGRAM_URL, WHATSAPP_CHANNEL } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/NotificationBell";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About Us" },
  { to: "/jobs", label: "Job Openings" },
  { to: "/interview-questions", label: "Interview Questions" },
  { to: "/resume-resources", label: "Resources" },
  { to: "/employer", label: "Employer" },
  { to: "/contact", label: "Contact Us" },
];

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" data-testid="site-logo">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 font-heading text-sm font-extrabold text-hero">
        DP
      </span>
      <span className="leading-tight">
        <span className={cn("block font-heading text-sm font-extrabold tracking-tight", dark ? "text-white" : "text-slate-900")}>
          DigiPhonics
        </span>
        <span className={cn("block font-mono text-[10px] uppercase tracking-[0.2em]", dark ? "text-amber-400" : "text-amber-800")}>
          Technology
        </span>
      </span>
    </Link>
  );
}

export default function SiteLayout() {
  const { data: me } = useMe();
  const user = me?.user;
  const [menuOpen, setMenuOpen] = useState(false);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
      isActive ? "text-amber-800" : "text-slate-600 hover:text-slate-900",
    );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-0.5 lg:flex" data-testid="site-desktop-nav">
            <NavLink to="/" end className={linkCls}>Home</NavLink>
            <NavLink to="/about" className={linkCls}>About Us</NavLink>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900" data-testid="site-nav-candidates">
                <span className="inline-flex items-center gap-1">
                  For Candidates <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {CATEGORIES.map((c) => (
                  <DropdownMenuItem key={c.key} className="p-0" data-testid={`site-nav-category-${c.slug}`}>
                    <Link to={`/candidates/${c.slug}`} className="flex w-full flex-col gap-0.5 px-3 py-2.5">
                      <span className="text-sm font-semibold text-slate-900">{c.label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">{c.badge}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {NAV.slice(2).map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {user ? (
              <>
                <Link
                  to={homeForRole(user.role)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  data-testid="site-my-portal-btn"
                >
                  <LayoutDashboard className="h-4 w-4" /> My Portal
                </Link>
                <button
                  onClick={() => endSession()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Sign out"
                  data-testid="site-logout-btn"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })} data-testid="site-login-btn">
                  Login
                </Link>
                <Link to="/register" className={buttonVariants({ size: "sm" })} data-testid="site-register-btn">
                  Employee Register
                </Link>
              </>
            )}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Open menu"
                data-testid="site-mobile-menu-btn"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetTitle>
                  <Logo />
                </SheetTitle>
                <nav className="mt-4 flex flex-col gap-1 pb-8" data-testid="site-mobile-nav">
                  {NAV.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn("rounded-lg px-3 py-2 text-sm font-medium", isActive ? "bg-amber-50 text-amber-800" : "text-slate-700 hover:bg-slate-100")
                      }
                    >
                      {n.label}
                    </NavLink>
                  ))}
                  <p className="mt-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">For Candidates</p>
                  {CATEGORIES.map((c) => (
                    <NavLink
                      key={c.key}
                      to={`/candidates/${c.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      {c.navLabel}
                    </NavLink>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 bg-hero text-hero-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <Logo dark />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-hero-muted">
                IT recruitment and career placement for freshers, career switchers, returning professionals and
                experienced engineers. Openings are published only after review.
              </p>
              <div className="mt-5 flex flex-wrap gap-2" data-testid="footer-social-links">
                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-hero-border bg-hero-card px-3 text-xs font-semibold text-hero-muted transition-colors hover:border-amber-500/50 hover:text-white" data-testid="footer-email-link">
                  <Mail className="h-3.5 w-3.5" /> {CONTACT_EMAIL}
                </a>
                <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-hero-border bg-hero-card px-3 text-xs font-semibold text-hero-muted transition-colors hover:border-amber-500/50 hover:text-white" data-testid="footer-whatsapp-link">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Channel
                </a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-hero-border bg-hero-card px-3 text-xs font-semibold text-hero-muted transition-colors hover:border-amber-500/50 hover:text-white" data-testid="footer-instagram-link">
                  <Instagram className="h-3.5 w-3.5" /> Instagram
                </a>
              </div>
              <p className="mt-4 rounded-lg border border-hero-border bg-hero-card p-3 text-xs leading-relaxed text-hero-muted" data-testid="footer-disclaimer">
                DigiPhonics Technology is a recruitment and career placement company — not a training institute.
                No job offer is ever guaranteed in exchange for payment.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">For Candidates</p>
              <ul className="mt-3 space-y-2 text-sm">
                {CATEGORIES.map((c) => (
                  <li key={c.key}>
                    <Link to={`/candidates/${c.slug}`} className="text-hero-muted transition-colors hover:text-white" data-testid={`footer-link-${c.slug}`}>
                      {c.navLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">Company</p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  { to: "/jobs", label: "Job Openings" },
                  { to: "/interview-questions", label: "Interview Questions" },
                  { to: "/resume-resources", label: "Career Resources" },
                  { to: "/employer", label: "Employer / Post a Job" },
                  { to: "/about", label: "About Us" },
                  { to: "/contact", label: "Contact Us" },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-hero-muted transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">Legal</p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  { to: "/privacy", label: "Privacy Policy" },
                  { to: "/terms", label: "Terms & Conditions" },
                  { to: "/service-agreement", label: "Candidate Service Agreement" },
                  { to: "/refund-policy", label: "Refund & Cancellation Policy" },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-hero-muted transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-hero-border pt-6 text-xs text-hero-muted sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} DigiPhonics Technology. All rights reserved.</p>
            <p className="font-mono uppercase tracking-wide">Recruitment &amp; Career Placement</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
