import { Link, NavLink, Outlet } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bookmark,
  Briefcase,
  ClipboardList,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ScrollText,
  User,
  Users,
} from "lucide-react";
import { useMe, endSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/NotificationBell";
import { Logo } from "@/components/site/SiteLayout";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAVS: Record<"candidate" | "employee" | "admin", NavItem[]> = {
  candidate: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/dashboard/profile", label: "My Profile", icon: User },
    { to: "/dashboard/applications", label: "Applications", icon: FileText },
    { to: "/dashboard/saved", label: "Saved Jobs", icon: Bookmark },
    { to: "/dashboard/offers", label: "Offers & Placement", icon: BadgeCheck },
    { to: "/dashboard/services", label: "Service Charges", icon: IndianRupee },
  ],
  employee: [{ to: "/employee", label: "My Workspace", icon: LayoutDashboard, end: true }],
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/jobs", label: "Jobs & Approvals", icon: Briefcase },
    { to: "/admin/applications", label: "Applications", icon: FileText },
    { to: "/admin/questions", label: "Question Bank", icon: ClipboardList },
    { to: "/admin/offers", label: "Offer Verification", icon: BadgeCheck },
    { to: "/admin/fees", label: "Fees & Invoices", icon: IndianRupee },
    { to: "/admin/users", label: "Users & Staff", icon: Users },
    { to: "/admin/content", label: "Site Content", icon: ScrollText },
    { to: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
  ],
};

const ROLE_LABELS = { candidate: "Candidate Portal", employee: "Employee Portal", admin: "Admin Console" };

function SidebarContent({ kind }: { kind: "candidate" | "employee" | "admin" }) {
  const { data } = useMe();
  const user = data?.user;
  return (
    <div className="flex h-full flex-col bg-hero text-hero-foreground">
      <div className="border-b border-hero-border p-4">
        <Logo dark />
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">{ROLE_LABELS[kind]}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" data-testid={`portal-nav-${kind}`}>
        {NAVS[kind].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-amber-700/20 text-amber-400"
                  : "text-hero-muted hover:bg-hero-card hover:text-white",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="border-t border-hero-border p-4">
          <p className="truncate text-sm font-semibold text-white" data-testid="portal-user-name">{user.full_name}</p>
          <p className="truncate text-xs text-hero-muted">{user.email}</p>
          <Badge variant="outline" className="mt-2 border-amber-700/40 bg-amber-700/10 font-mono text-[10px] uppercase tracking-wide text-amber-400">
            {user.role}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full border-hero-border bg-transparent text-hero-muted hover:bg-hero-card hover:text-white"
            onClick={() => endSession()}
            data-testid="portal-logout-btn"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PortalLayout({ kind }: { kind: "candidate" | "employee" | "admin" }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{<SidebarContent kind={kind} />}</aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:px-8">
          <Sheet>
            <SheetTrigger
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Open portal menu"
              data-testid="portal-mobile-menu-btn"
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 p-0">
              <SheetTitle className="sr-only">Portal menu</SheetTitle>
              <SidebarContent kind={kind} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" data-testid="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
