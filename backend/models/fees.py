"""Configurable placement service charges: terms, candidate consent, invoices.
Payments are DISABLED until a provider + approved terms are configured — reconciliation is manual."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


FEE_STATUSES = ["due", "payment_claimed", "paid", "disputed", "cancelled", "refunded"]


class AcceptTerms(BaseModel):
    service_id: str


class ServiceConfigCreate(BaseModel):
    service_name: str = Field(min_length=1)
    description: str  # candidate-facing explanation shown before consent
    fee_amount: float = Field(gt=0)
    currency: str = "INR"
    tax_details: str | None = None
    who_pays: str  # candidate | employer | company_sponsored
    trigger_conditions: str  # when the fee becomes applicable
    refund_cancellation_terms: str
    due_terms: str | None = None
    active: bool = True


class ServiceConfigUpdate(BaseModel):
    service_name: str | None = None
    description: str | None = None
    fee_amount: float | None = None
    currency: str | None = None
    tax_details: str | None = None
    who_pays: str | None = None
    trigger_conditions: str | None = None
    refund_cancellation_terms: str | None = None
    due_terms: str | None = None
    active: bool | None = None


class ServiceConfig(BaseModel):
    id: str = Field(default_factory=_uuid)
    service_name: str
    description: str
    fee_amount: float
    currency: str = "INR"
    tax_details: str | None = None
    who_pays: str
    trigger_conditions: str
    refund_cancellation_terms: str
    due_terms: str | None = None
    version: int = 1
    active: bool = True
    created_by: str | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class FeeAgreement(BaseModel):
    id: str = Field(default_factory=_uuid)
    candidate_id: str
    service_id: str
    service_name: str
    terms_version: int
    accepted_at: datetime = Field(default_factory=_now)


class FeeRecordCreate(BaseModel):
    candidate_id: str
    service_id: str
    due_date: str | None = None  # YYYY-MM-DD
    admin_notes: str | None = None


class PaymentConfirm(BaseModel):
    provider_reference: str | None = None
    receipt_notes: str | None = None


class DisputeUpdate(BaseModel):
    status: str  # disputed | cancelled | refunded | due
    admin_notes: str | None = None


class FeeRecord(BaseModel):
    id: str = Field(default_factory=_uuid)
    candidate_id: str
    agreement_id: str | None = None
    service_name: str
    invoice_number: str
    amount: float
    currency: str = "INR"
    status: str = "due"  # due | payment_claimed | paid | disputed | cancelled | refunded
    due_date: str | None = None
    provider_reference: str | None = None
    receipt_issued: bool = False
    receipt_notes: str | None = None
    admin_notes: str | None = None
    dispute_status: str | None = None
    payment_confirmed_by: str | None = None
    payment_confirmed_at: datetime | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
