"""Notifications, contact enquiries, file metadata, audit logs, site content."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Notification(BaseModel):
    id: str = Field(default_factory=_uuid)
    user_id: str
    title: str
    body: str | None = None
    link: str | None = None
    read: bool = False
    created_at: datetime = Field(default_factory=_now)


class ContactEnquiryCreate(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    phone: str | None = None
    subject: str | None = None
    message: str = Field(min_length=1)


class ContactEnquiry(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    email: str
    phone: str | None = None
    subject: str | None = None
    message: str
    status: str = "new"  # new | in_progress | resolved
    created_at: datetime = Field(default_factory=_now)


class FileMeta(BaseModel):
    id: str
    original_name: str | None = None
    content_type: str | None = None
    size: int
    uploader_id: str
    category: str
    created_at: datetime


class AuditLog(BaseModel):
    id: str
    actor_id: str | None = None
    actor_email: str | None = None
    actor_role: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: str | None = None
    details: str | None = None
    created_at: datetime


class SiteContentUpdate(BaseModel):
    value: str


class SiteContent(BaseModel):
    key: str
    value: str
    updated_by: str | None = None
    updated_at: datetime = Field(default_factory=_now)
