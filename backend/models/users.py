"""User accounts, candidate profiles (all 4 categories), employee profiles."""

import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


CANDIDATE_CATEGORIES = ["fresher", "non_it_to_it", "career_gap", "experienced"]

CATEGORY_LABELS = {
    "fresher": "Fresher",
    "non_it_to_it": "Non-IT to IT",
    "career_gap": "Career Gap",
    "experienced": "Experienced",
}


class EducationEntry(BaseModel):
    degree: str
    institution: str | None = None
    year: str | None = None
    score: str | None = None


class SkillProficiency(BaseModel):
    name: str
    level: str = "beginner"  # beginner | intermediate | advanced | expert


class CandidateProfile(BaseModel):
    """One unified profile across all four candidate categories — a candidate can
    change category later without losing their profile or application history."""

    id: str = Field(default_factory=_uuid)
    user_id: str
    category: str = "fresher"
    current_location: str | None = None
    education: list[EducationEntry] = []
    graduation_year: int | None = None
    skills: list[str] = []
    preferred_roles: list[str] = []
    preferred_locations: list[str] = []
    preferred_work_mode: str | None = None  # onsite | hybrid | remote | any
    portfolio_url: str | None = None
    linkedin_url: str | None = None
    resume_file_id: str | None = None
    # Freshers
    projects: str | None = None
    internships: str | None = None
    certifications: str | None = None
    # Non-IT to IT
    previous_industry: str | None = None
    transferable_skills: list[str] = []
    self_reported_skills: list[SkillProficiency] = []
    # Career gap
    last_designation: str | None = None
    career_break_months: int | None = None
    career_gap_explanation: str | None = None
    # Experienced
    total_experience_years: float | None = None
    current_designation: str | None = None
    current_company: str | None = None
    current_salary: str | None = None  # optional, free text
    expected_salary: str | None = None  # optional, free text
    notice_period: str | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class EmployeeDocument(BaseModel):
    id: str = Field(default_factory=_uuid)
    doc_type: str
    file_id: str
    label: str | None = None
    verification_status: str = "pending"  # pending | approved | rejected
    uploaded_at: datetime = Field(default_factory=_now)


WORKING_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
ATTENDANCE_STATUSES = ["present", "absent", "leave", "half_day", "week_off"]


class EmployeeProfile(BaseModel):
    id: str = Field(default_factory=_uuid)
    user_id: str
    employee_code: str | None = None
    designation: str | None = None
    department: str | None = None
    # onboarding step 1 — personal details
    father_name: str | None = None
    mother_name: str | None = None
    date_of_birth: str | None = None
    address: str | None = None
    emergency_contact: str | None = None
    photo_file_id: str | None = None
    # onboarding progress: 1 = details, 2 = documents, 3 = submitted for admin approval
    onboarding_step: int = 1
    submitted_at: datetime | None = None
    review_note: str | None = None
    working_days: list[str] = []
    verification_status: str = "pending"  # pending | submitted | approved | rejected
    documents: list[EmployeeDocument] = []
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class OnboardingDetails(BaseModel):
    full_name: str = Field(min_length=1)
    father_name: str = Field(min_length=1)
    mother_name: str = Field(min_length=1)
    date_of_birth: str = Field(min_length=4)
    phone: str = Field(min_length=5)
    address: str = Field(min_length=3)
    emergency_contact: str | None = None
    designation: str | None = None
    photo_file_id: str | None = None


class AttendanceRecord(BaseModel):
    id: str = Field(default_factory=_uuid)
    employee_id: str
    date: str  # YYYY-MM-DD, anchored server-side
    status: str = "present"
    check_in: str | None = None
    note: str | None = None
    marked_by: str  # user id of whoever recorded it
    marked_by_role: str = "employee"
    created_at: datetime = Field(default_factory=_now)


class UserOut(BaseModel):
    id: str
    email: str
    role: str  # candidate | employer | employee | admin
    full_name: str
    phone: str | None = None
    active: bool = True
    company_name: str | None = None
    created_at: datetime


class MeResponse(BaseModel):
    user: UserOut
    candidate_profile: CandidateProfile | None = None
    employee_profile: EmployeeProfile | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    phone: str | None = None
    # Public registration creates employee (staff) accounts only — pending admin approval.
    role: Literal["employee"] = "employee"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CandidateProfileUpdate(BaseModel):
    """All fields optional — PATCH-style update of the candidate profile."""

    category: str | None = None
    current_location: str | None = None
    education: list[EducationEntry] | None = None
    graduation_year: int | None = None
    skills: list[str] | None = None
    preferred_roles: list[str] | None = None
    preferred_locations: list[str] | None = None
    preferred_work_mode: str | None = None
    portfolio_url: str | None = None
    linkedin_url: str | None = None
    resume_file_id: str | None = None
    projects: str | None = None
    internships: str | None = None
    certifications: str | None = None
    previous_industry: str | None = None
    transferable_skills: list[str] | None = None
    self_reported_skills: list[SkillProficiency] | None = None
    last_designation: str | None = None
    career_break_months: int | None = None
    career_gap_explanation: str | None = None
    total_experience_years: float | None = None
    current_designation: str | None = None
    current_company: str | None = None
    current_salary: str | None = None
    expected_salary: str | None = None
    notice_period: str | None = None
