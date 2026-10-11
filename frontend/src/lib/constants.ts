// Static app copy: the four candidate tracks, stage rails, question categories and
// default site content (used when the admin has not overridden a content key yet).

export interface CategoryMeta {
  key: string;
  slug: string;
  label: string;
  navLabel: string;
  badge: string;
  tagline: string;
  idealFor: string;
  intro: string;
  highlights: string[];
  profileFieldsNote: string;
  badgeClass: string;
  chipClass: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "fresher",
    slug: "freshers",
    label: "Freshers",
    navLabel: "For Freshers",
    badge: "Entry Level (0–1 yrs)",
    tagline: "Turn your degree into your first IT offer.",
    idealFor: "B.Tech/BE, BCA/MCA, BSc IT and equivalent graduates from any recognised university.",
    intro:
      "You do not need prior work experience to be considered for IT roles — you need a clear profile, demonstrable skills and honest project work. DigiPhonics Technology helps freshers present education, projects, internships and certifications in the format recruiters actually screen for, then connects that profile to genuine entry-level openings.",
    highlights: [
      "Create a profile with education, graduation year, skills, projects, internships and certifications",
      "Upload one resume and keep it current across every application",
      "Search and filter entry-level openings by required experience",
      "Track every application from Applied through to Offer",
      "Practise with aptitude, coding and fresher interview questions",
    ],
    profileFieldsNote: "Education, graduation year, skills, projects, internships, certifications and your resume.",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    chipClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "non_it_to_it",
    slug: "non-it-to-it",
    label: "Non-IT to IT",
    navLabel: "Non-IT to IT",
    badge: "Career Transition",
    tagline: "Your domain experience is an asset — present it that way.",
    idealFor: "Working professionals from BPO, sales, operations, mechanical, civil, finance and other non-IT fields.",
    intro:
      "Career switchers succeed in IT when they present previous experience honestly and map it to the role they want. We help you document transferable skills, declare your self-taught technical proficiency transparently, and find employers who explicitly accept career-switcher profiles.",
    highlights: [
      "Record your previous industry and work experience in detail",
      "List transferable skills alongside your technical skills with honest self-rated proficiency",
      "Declare preferred IT roles and build a project portfolio that proves them",
      "Find openings that explicitly accept career switchers",
      "Prepare for transition questions like 'why the move into IT?' with our question library",
    ],
    profileFieldsNote: "Previous industry, transferable skills, technical proficiency, preferred roles, resume and portfolio.",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
    chipClass: "bg-amber-50 text-amber-800 border-amber-300",
  },
  {
    key: "career_gap",
    slug: "career-gap",
    label: "Career Gap Candidates",
    navLabel: "Career Gap Candidates",
    badge: "Career Restart",
    tagline: "A break is a chapter of your story, not the end of it.",
    idealFor: "Professionals returning after a break — maternity, health, family care, civil-service preparation or sabbaticals.",
    intro:
      "DigiPhonics Technology treats career-gap information with respect and confidentiality. A break never automatically disqualifies you. You choose what to share in your optional explanation, and we surface your openings to employers who evaluate returning professionals on skills and readiness — not on the length of the gap.",
    highlights: [
      "Record your previous role, last designation and break duration — confidentially",
      "An optional, private explanation of the gap that you control",
      "Showcase your current skills and previous projects on their own merit",
      "Get matched to return-to-work friendly openings with your preferred role and location",
      "Practise answers to career-break interview questions before the real thing",
    ],
    profileFieldsNote: "Previous experience, last designation, break duration, optional explanation, current skills and resume.",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    chipClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    key: "experienced",
    slug: "experienced",
    label: "Experienced Professionals",
    navLabel: "Experienced Professionals",
    badge: "Experienced (2–12+ yrs)",
    tagline: "Move further, faster — with leverage from your track record.",
    idealFor: "Mid to senior engineers and specialists targeting senior engineering, lead, DevOps and architect roles.",
    intro:
      "Experienced candidates are evaluated on depth: your technology stack, the scale you have operated at, and your availability. We keep your current and expected salary private by default, surface roles that match your notice period, and track every conversation through to offer and joining.",
    highlights: [
      "Document total experience, designations, current and expected salary — both optional",
      "Declare notice period and availability so recruiters shortlist realistically",
      "Showcase your technology stack and expertise area by area",
      "Save searches, save jobs and get relevant openings from your dashboard",
      "Track applications and interview progress end to end",
    ],
    profileFieldsNote: "Total experience, designations, current/expected salary (optional), notice period, tech stack, resume and portfolio.",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    chipClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

export function categoryBySlug(slug?: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryByKey(key?: string | null): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

// Homepage "Browse jobs by technology"
export const TECH_LIST = [
  "Python",
  "Java",
  "Generative AI",
  "Machine Learning",
  "Cybersecurity",
  "Software Testing",
  "DevOps",
  "UI/UX",
  "Data Analytics",
  "Cloud Computing",
  "Full Stack Development",
  "SQL",
];

// Interview question categories, grouped for the library page.
export const QUESTION_CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "Programming & Development",
    items: [
      "Python",
      "Java",
      "HTML, CSS, JavaScript",
      "React & Frontend",
      "Backend Development",
      "SQL & DBMS",
      "Data Structures & Algorithms",
      "System Design",
    ],
  },
  {
    group: "AI, Data & Security",
    items: ["Generative AI", "Artificial Intelligence", "Machine Learning", "Cybersecurity", "Data Analytics"],
  },
  {
    group: "Testing & Quality",
    items: ["Manual Testing", "Automation Testing", "Selenium", "API Testing"],
  },
  {
    group: "Cloud & Operations",
    items: ["DevOps", "AWS", "Azure", "Operating Systems", "Computer Networks"],
  },
  {
    group: "Career & HR",
    items: [
      "HR Interview Questions",
      "Freshers Interview Questions",
      "Non-IT to IT Transition",
      "Career Gap Interview Questions",
      "Experienced Candidate Questions",
      "Project-Based Questions",
      "Resume-Based Questions",
      "Aptitude",
      "Logical Reasoning",
      "UI/UX",
    ],
  },
];

export const QUESTION_CATEGORIES = QUESTION_CATEGORY_GROUPS.flatMap((g) => g.items);

// Default site content. The admin can override any key from the admin portal; pages fall
// back to these when no stored value exists. All copy is original — no fabricated facts.
export const DEFAULT_CONTENT: Record<string, string> = {
  announcement:
    "DigiPhonics Technology is a recruitment and career placement company. We do not sell training courses, and we never guarantee a job offer in exchange for payment.",
  about:
    "DigiPhonics Technology is an IT recruitment and career placement company. We connect candidates — freshers, professionals transitioning from non-IT fields, people returning after a career break, and experienced engineers — with genuine, verified IT job openings.\n\nWe are not a training institute. We do not sell courses or batches. What we do is straightforward: we help candidates present their real experience well, prepare them with an honest interview-question library, and work with employers to publish openings that are accurately described and properly reviewed before they go live.\n\nEvery employer submission is reviewed by our team before publication. Where we complete additional employer and vacancy checks, we mark the opening as verified — and we never claim verification we have not performed.",
  services:
    "For candidates: profile building on real experience, job-matching across our four candidate tracks, application tracking, interview preparation resources, and offer-letter verification support.\n\nFor employers: job requirement intake, candidate shortlisting support, interview coordination, and controlled publication of your openings after review.\n\nAny service that carries a fee is always governed by a written agreement that you accept explicitly before it applies — fees are never triggered merely by registering, uploading a resume, applying, or receiving an offer letter.",
  career_support:
    "Candidate career support includes resume guidance, interview preparation checklists, a searchable question library across 30+ categories, practice sets, and honest feedback about which openings fit your profile.",
  employer_solutions:
    "Employers submit their vacancy details once; our team reviews the company and role information, requests evidence where needed, and only then publishes the opening. You keep control of your listing and can update it at any time.",
  contact_info:
    "Reach us on email, our WhatsApp channel, or Instagram — our team responds within two business days. Registered candidates and employers can also reach their assigned contact from inside their portal.",
  privacy:
    "We collect only the information needed to run a recruitment service: your identity and contact details, your profile information, your resume, and records of your applications.\n\nYour resume, offer letters and identity documents are private. They are never shown in public search results. Offer letters are visible only to you and to authorised, assigned reviewers. Download access is logged and uses short-lived links.\n\nWe do not sell your personal information. We do not share your profile with employers without an application from you or your explicit consent.\n\nYou can request correction or deletion of your data from your account settings or by writing to us. We retain application records only as long as needed to provide the service and to satisfy legal obligations.\n\nThis summary is provided for convenience; the full policy as amended from time to time applies.",
  terms:
    "By using this platform you agree to provide accurate information about your identity, education, experience and skills. Misrepresented profiles may be suspended.\n\nEmployers must be genuine entities with real vacancies. Submitting false openings, or roles that require payment from candidates, is prohibited.\n\nDigiPhonics Technology facilitates introductions and tracking; the employment contract is always between you and the employer. We do not guarantee any offer, timeline or outcome.\n\nThese terms may be updated; the version in force when you act applies.",
  service_agreement:
    "Placement-related services may carry a fee only under a written service agreement that you accept explicitly in the portal, with the version and timestamp recorded.\n\nNo fee is triggered by registration, resume upload, job application, or receiving an offer letter. A fee becomes applicable only when the specific condition stated in the agreement you accepted is met — for example, after an offer letter is released and verified.\n\nBefore you accept, the service name, amount, taxes (if any), who pays, trigger conditions, due terms, and refund & cancellation terms are all displayed. You can review every invoice and the applicable terms in your portal at any time.\n\nPayments are disabled on this platform until a payment provider and approved agreement terms are configured. Any invoice issued in the meantime is settled only through manual reconciliation, confirmed by our team.\n\nWe never represent a job offer as guaranteed in exchange for payment, and we never withhold or alter a candidate's offer letter.",
  refund_policy:
    "If a service you have paid for under an accepted agreement is cancelled, or if the agreed condition is never met, the applicable amount is refunded according to the refund and cancellation terms shown in the agreement you accepted.\n\nTo raise a refund or cancellation request, open the invoice in your portal and use the dispute option, or write to us with your invoice number. Requests are recorded with a timestamp and reviewed by an authorised reviewer; you are notified of the outcome in your portal.\n\nApproved refunds are returned through the original payment route wherever possible.",
  footer_note:
    "DigiPhonics Technology is a recruitment and career placement company — not a training institute. Job listings are published only after review.",
};
