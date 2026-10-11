import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { RequireRole } from "@/components/RequireRole";
import SiteLayout from "@/components/site/SiteLayout";
import PortalLayout from "@/components/PortalLayout";
import { useMe } from "@/lib/session";

// Public
import Home from "@/pages/Home";
import About from "@/pages/About";
import CandidateCategory from "@/pages/CandidateCategory";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import InterviewQuestions from "@/pages/InterviewQuestions";
import ResumeResources from "@/pages/ResumeResources";
import Employer from "@/pages/Employer";
import Contact from "@/pages/Contact";
import LegalPage from "@/pages/LegalPage";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

// Employee portal
import EmployeeDashboard from "@/pages/employee/Dashboard";
import EmployeeOnboarding from "@/pages/employee/Onboarding";
import EmployeeAttendance from "@/pages/employee/Attendance";

// Admin portal
import AdminOverview from "@/pages/admin/Overview";
import AdminJobs from "@/pages/admin/Jobs";
import AdminApplications from "@/pages/admin/Applications";
import AdminQuestions from "@/pages/admin/Questions";
import AdminOffers from "@/pages/admin/Offers";
import AdminFees from "@/pages/admin/Fees";
import AdminUsers from "@/pages/admin/Users";
import AdminEmployees from "@/pages/admin/Employees";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminContent from "@/pages/admin/Content";
import AdminEnquiries from "@/pages/admin/Enquiries";

// Until an admin approves the onboarding submission, the only employee screen is the wizard.
function RequireApprovedEmployee({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const location = useLocation();
  if (isLoading) return null;
  const approved = data?.employee_profile?.verification_status === "approved";
  if (!approved && location.pathname !== "/employee/onboarding") {
    return <Navigate to="/employee/onboarding" replace />;
  }
  return <>{children}</>;
}

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        {/* Standalone auth screens (no site chrome) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Public site */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/candidates/:slug" element={<CandidateCategory />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:jobId" element={<JobDetail />} />
          <Route path="/interview-questions" element={<InterviewQuestions />} />
          <Route path="/resume-resources" element={<ResumeResources />} />
          <Route path="/employer" element={<Employer />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<LegalPage pageKey="privacy" />} />
          <Route path="/terms" element={<LegalPage pageKey="terms" />} />
          <Route path="/service-agreement" element={<LegalPage pageKey="service_agreement" />} />
          <Route path="/refund-policy" element={<LegalPage pageKey="refund_policy" />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Employee portal — gated on admin approval */}
        <Route
          path="/employee"
          element={
            <RequireRole roles={["employee"]}>
              <RequireApprovedEmployee>
                <PortalLayout kind="employee" />
              </RequireApprovedEmployee>
            </RequireRole>
          }
        >
          <Route index element={<EmployeeDashboard />} />
          <Route path="onboarding" element={<EmployeeOnboarding />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
        </Route>

        {/* Admin portal */}
        <Route
          path="/admin"
          element={
            <RequireRole roles={["admin"]}>
              <PortalLayout kind="admin" />
            </RequireRole>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="questions" element={<AdminQuestions />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="fees" element={<AdminFees />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
        </Route>
      </Routes>
      <Toaster richColors />
    </>
  );
}
