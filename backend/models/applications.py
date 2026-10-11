"""Job applications, stage history, interview scheduling."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class StatusEvent(BaseModel):
    status: str
    note: str | None = None
    changed_by: str | None = None
    changed_by_name: str | None = None
    changed_at: datetime


class InterviewCreate(BaseModel):
    scheduled_at: datetime
    timezone: str = "Asia/Kolkata"
    interview_type: str = "online"  # online | onsite | phone
    meeting_link: str | None = None
    venue: str | None = None
    interviewer_name: str | None = None
    interviewer_designation: str | None = None


class Interview(BaseModel):
    id: str = Field(default_factory=_uuid)
    application_id: str
    scheduled_at: datetime
    timezone: str = "Asia/Kolkata"
    interview_type: str = "online"
    meeting_link: str | None = None
    venue: str | None = None
    interviewer_name: str | None = None
    interviewer_designation: str | None = None
    created_by: str | None = None
    created_at: datetime = Field(default_factory=_now)


class ApplicationCreate(BaseModel):
    cover_note: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class Application(BaseModel):
    id: str = Field(default_factory=_uuid)
    job_id: str
    candidate_id: str
    job_title: str
    company_name: str
    cover_note: str | None = None
    resume_file_id: str | None = None
    status: str = "applied"
    status_history: list[StatusEvent] = []
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
