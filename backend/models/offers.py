"""Placement / offer-letter submissions. Offer letters are private: candidate + authorized reviewers only."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


OFFER_STATUSES = ["pending", "approved", "needs_resubmission", "rejected"]


class OfferCreate(BaseModel):
    company_name: str = Field(min_length=1)
    job_title: str = Field(min_length=1)
    role: str | None = None
    offer_date: str  # YYYY-MM-DD
    joining_date: str | None = None
    employment_type: str | None = None
    offer_letter_file_id: str
    notes: str | None = None


class OfferResubmit(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    role: str | None = None
    offer_date: str | None = None
    joining_date: str | None = None
    employment_type: str | None = None
    offer_letter_file_id: str | None = None
    notes: str | None = None


class OfferReview(BaseModel):
    decision: str  # approved | needs_resubmission | rejected
    notes: str | None = None


class OfferSubmission(BaseModel):
    id: str = Field(default_factory=_uuid)
    candidate_id: str
    company_name: str
    job_title: str
    role: str | None = None
    offer_date: str
    joining_date: str | None = None
    employment_type: str | None = None
    offer_letter_file_id: str
    notes: str | None = None
    status: str = "pending"  # pending | approved | needs_resubmission | rejected
    reviewed_by: str | None = None
    reviewed_by_name: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
