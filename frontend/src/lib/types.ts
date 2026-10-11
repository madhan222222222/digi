// Hand-written mirrors of the backend Pydantic models — nothing infers across the
// HTTP boundary, so every interface here is kept in sync manually with backend/models/*.

export interface EducationEntry {
  degree: string;
  institution?: string | null;
  year?: string | null;
  score?: string | null;
}

export interface SkillProficiency {
  name: string;
  level: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  category: string;
  current_location?: string | null;
  education: EducationEntry[];
  graduation_year?: number | null;
  skills: string[];
  preferred_roles: string[];
  preferred_locations: string[];
  preferred_work_mode?: string | null;
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  resume_file_id?: string | null;
  projects?: string | null;
  internships?: string | null;
  certifications?: string | null;
  previous_industry?: string | null;
  transferable_skills: string[];
  self_reported_skills: SkillProficiency[];
  last_designation?: string | null;
  career_break_months?: number | null;
  career_gap_explanation?: string | null;
  total_experience_years?: number | null;
  current_designation?: string | null;
  current_company?: string | null;
  current_salary?: string | null;
  expected_salary?: string | null;
  notice_period?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: string;
  doc_type: string;
  file_id: string;
  label?: string | null;
  verification_status: string;
  uploaded_at: string;
}

export interface EmployeeProfile {
  id: string;
  user_id: string;
  employee_code?: string | null;
  designation?: string | null;
  department?: string | null;
  verification_status: string;
  documents: EmployeeDocument[];
  created_at: string;
  updated_at: string;
}

export type UserRole = "candidate" | "employer" | "employee" | "admin";

export interface UserOut {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  active: boolean;
  company_name?: string | null;
  created_at: string;
}

export interface MeResponse {
  user: UserOut;
  candidate_profile?: CandidateProfile | null;
  employee_profile?: EmployeeProfile | null;
}

export interface Job {
  id: string;
  company_name: string;
  company_website?: string | null;
  company_overview?: string | null;
  recruiter_name?: string | null;
  recruiter_designation?: string | null;
  recruiter_email?: string | null;
  recruiter_phone?: string | null;
  title: string;
  description: string;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  min_experience: number;
  max_experience?: number | null;
  eligibility?: string | null;
  candidate_categories: string[];
  location?: string | null;
  work_mode: string;
  employment_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  vacancies?: number | null;
  interview_rounds?: string | null;
  application_deadline?: string | null;
  application_instructions?: string | null;
  source: string;
  logo_file_id?: string | null;
  verification_status: string;
  status: string;
  employer_id?: string | null;
  submission_email?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  posted_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface StatusEvent {
  status: string;
  note?: string | null;
  changed_by?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  job_title: string;
  company_name: string;
  cover_note?: string | null;
  resume_file_id?: string | null;
  status: string;
  status_history: StatusEvent[];
  created_at: string;
  updated_at: string;
}

export type ApplicationRow = Application & {
  candidate_name?: string | null;
  candidate_email?: string | null;
};

export interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string;
  timezone: string;
  interview_type: string;
  meeting_link?: string | null;
  venue?: string | null;
  interviewer_name?: string | null;
  interviewer_designation?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  question: string;
  category: string;
  topic?: string | null;
  difficulty: string;
  question_type: string;
  answer?: string | null;
  explanation?: string | null;
  example?: string | null;
  options: string[];
  related_ids: string[];
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfferSubmission {
  id: string;
  candidate_id: string;
  company_name: string;
  job_title: string;
  role?: string | null;
  offer_date: string;
  joining_date?: string | null;
  employment_type?: string | null;
  offer_letter_file_id: string;
  notes?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type OfferRow = OfferSubmission & {
  candidate_name?: string | null;
  candidate_email?: string | null;
};

export interface ServiceConfig {
  id: string;
  service_name: string;
  description: string;
  fee_amount: number;
  currency: string;
  tax_details?: string | null;
  who_pays: string;
  trigger_conditions: string;
  refund_cancellation_terms: string;
  due_terms?: string | null;
  version: number;
  active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeAgreement {
  id: string;
  candidate_id: string;
  service_id: string;
  service_name: string;
  terms_version: number;
  accepted_at: string;
}

export interface FeeRecord {
  id: string;
  candidate_id: string;
  agreement_id?: string | null;
  service_name: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date?: string | null;
  provider_reference?: string | null;
  receipt_issued: boolean;
  receipt_notes?: string | null;
  admin_notes?: string | null;
  dispute_status?: string | null;
  payment_confirmed_by?: string | null;
  payment_confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type FeeRow = FeeRecord & {
  candidate_name?: string | null;
  candidate_email?: string | null;
};

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: string;
  created_at: string;
}

export interface FileMeta {
  id: string;
  original_name?: string | null;
  content_type?: string | null;
  size: number;
  uploader_id: string;
  category: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
  created_at: string;
}

export interface SiteContent {
  key: string;
  value: string;
  updated_by?: string | null;
  updated_at: string;
}

export interface Assignment {
  id: string;
  employee_id: string;
  assignment_type: string;
  target_id: string;
  assigned_by?: string | null;
  active: boolean;
  created_at: string;
  employee_name?: string | null;
}

export interface AdminStats {
  total_candidates: number;
  candidates_by_category: Record<string, number>;
  new_candidates_7d: number;
  pending_job_submissions: number;
  jobs_published: number;
  jobs_closed: number;
  applications_by_stage: Record<string, number>;
  upcoming_interviews: number;
  offers_submitted: number;
  offers_pending: number;
  placements_verified: number;
  fee_records_by_status: Record<string, number>;
  disputes_open: number;
  questions_total: number;
  questions_published: number;
  enquiries_new: number;
  employees: number;
  today: string;
}

export interface UpcomingInterview {
  id: string;
  application_id: string;
  scheduled_at: string;
  timezone?: string | null;
  interview_type?: string | null;
  meeting_link?: string | null;
  venue?: string | null;
  interviewer_name?: string | null;
}

export interface CandidateDashboard {
  profile_completion: number;
  counts: {
    applications: number;
    saved_jobs: number;
    unread_notifications: number;
    bookmarks: number;
    offers: number;
    verified_placements: number;
  };
  applications_by_status: Record<string, number>;
  upcoming_interviews: UpcomingInterview[];
  latest_offer?: OfferSubmission | null;
  today: string;
}

export interface IdCard {
  employee_code?: string | null;
  full_name?: string | null;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  company: string;
  issued: boolean;
}

export interface DownloadLink {
  url: string;
  expires_at: string;
}
