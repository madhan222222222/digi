"""Job postings: public portal + employer submissions + admin moderation."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


def _now() -> datetime:
    from datetime import timezone
    return datetime.now(timezone.utc)


JOB_STATUSES = ["pending", "approved", "rejected", "paused", "closed", "archived"]
WORK_MODES = ["onsite", "hybrid", "remote"]
EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship"]


class JobCreate(BaseModel):
    # Company
    company_name: str = Field(min_length=1)
    company_website: str | None = None
    company_overview: str | None = None
    recruiter_name: str | None = None
    recruiter_designation: str | None = None
    recruiter_email: str | None = None
    recruiter_phone: str | None = None
    # Job
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    responsibilities: list[str] = []
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    min_experience: float = 0
    max_experience: float | None = None
    eligibility: str | None = None
    candidate_categories: list[str] = []  # fresher | non_it_to_it | career_gap | experienced
    location: str | None = None
    work_mode: str = "onsite"
    employment_type: str = "full_time"
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str = "INR"
    vacancies: int | None = None
    interview_rounds: str | None = None
    application_deadline: str | None = None  # YYYY-MM-DD
    application_instructions: str | None = None
    source: str = "employer_submission"
    supporting_file_id: str | None = None


class JobUpdate(BaseModel):
    """Admin full-edit; employer edit of own listings. All optional."""

    company_name: str | None = None
    company_website: str | None = None
    company_overview: str | None = None
    recruiter_name: str | None = None
    recruiter_designation: str | None = None
    recruiter_email: str | None = None
    recruiter_phone: str | None = None
    title: str | None = None
    description: str | None = None
    responsibilities: list[str] | None = None
    required_skills: list[str] | None = None
    preferred_skills: list[str] | None = None
    min_experience: float | None = None
    max_experience: float | None = None
    eligibility: str | None = None
    candidate_categories: list[str] | None = None
    location: str | None = None
    work_mode: str | None = None
    employment_type: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    vacancies: int | None = None
    interview_rounds: str | None = None
    application_deadline: str | None = None
    application_instructions: str | None = None


class JobModerate(BaseModel):
    status: Literal["approved", "rejected", "paused", "closed", "archived"]
    notes: str | None = None


class JobVerify(BaseModel):
    verification_status: Literal["verified", "unverified"]
    notes: str | None = None


class Job(BaseModel):
    id: str
    company_name: str
    company_website: str | None = None
    company_overview: str | None = None
    recruiter_name: str | None = None
    recruiter_designation: str | None = None
    recruiter_email: str | None = None
    recruiter_phone: str | None = None
    title: str
    description: str
    responsibilities: list[str] = []
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    min_experience: float = 0
    max_experience: float | None = None
    eligibility: str | None = None
    candidate_categories: list[str] = []
    location: str | None = None
    work_mode: str = "onsite"
    employment_type: str = "full_time"
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str = "INR"
    vacancies: int | None = None
    interview_rounds: str | None = None
    application_deadline: str | None = None
    application_instructions: str | None = None
    source: str = "employer_submission"
    verification_status: str = "unverified"  # verified | unverified
    status: str = "pending"  # pending | approved | rejected | paused | closed | archived
    employer_id: str | None = None
    submission_email: str | None = None
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    posted_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
