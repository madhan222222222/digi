import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { RequireRole } from "@/components/RequireRole";
import SiteLayout from "@/components/site/SiteLayout";
import PortalLayout from "@/components/PortalLayout";

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

// Candidate portal
import CandidateDashboard from "@/pages/candidate/Dashboard";
import CandidateProfilePage from "@/pages/candidate/Profile";
import CandidateApplications from "@/pages/candidate/Applications";
import SavedJobs from "@/pages/candidate/SavedJobs";
import CandidateOffers from "@/pages/candidate/Offers";
import CandidateServices from "@/pages/candidate/Services";

// Employee portal
import EmployeeDashboard from "@/pages/employee/Dashboard";

// Admin portal
import AdminOverview from "@/pages/admin/Overview";
import AdminJobs from "@/pages/admin/Jobs";
import AdminApplications from "@/pages/admin/Applications";
import AdminQuestions from "@/pages/admin/Questions";
import AdminOffers from "@/pages/admin/Offers";
import AdminFees from "@/pages/admin/Fees";
import AdminUsers from "@/pages/admin/Users";
import AdminContent from "@/pages/admin/Content";
import AdminEnquiries from "@/pages/admin/Enquiries";

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

        {/* Candidate portal */}
        <Route
          path="/dashboard"
          element={
            <RequireRole roles={["candidate"]}>
              <PortalLayout kind="candidate" />
            </RequireRole>
          }
        >
          <Route index element={<CandidateDashboard />} />
          <Route path="profile" element={<CandidateProfilePage />} />
          <Route path="applications" element={<CandidateApplications />} />
          <Route path="saved" element={<SavedJobs />} />
          <Route path="offers" element={<CandidateOffers />} />
          <Route path="services" element={<CandidateServices />} />
        </Route>

        {/* Employee portal */}
        <Route
          path="/employee"
          element={
            <RequireRole roles={["employee"]}>
              <PortalLayout kind="employee" />
            </RequireRole>
          }
        >
          <Route index element={<EmployeeDashboard />} />
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
          <Route path="users" element={<AdminUsers />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
        </Route>
      </Routes>
      <Toaster richColors />
    </>
  );
}
