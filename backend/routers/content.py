"""Editable site content (admin-managed) + public contact enquiries."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import audit, get_current_user, notify_admins, require_roles
from lib.db import db
from lib.storage import as_utc, clean
from models.misc import ContactEnquiry, ContactEnquiryCreate, SiteContent

router = APIRouter(prefix="/content", tags=["content"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/{key}", response_model=SiteContent)
async def get_content(key: str):
    """Returns an empty value when the admin has not customised this key — the frontend then
    renders its bundled default copy. A 404 here would only add console noise."""
    doc = await db.site_content.find_one({"key": key})
    if not doc:
        return SiteContent(key=key, value="", updated_by=None, updated_at=_now())
    return SiteContent(**{**clean(doc), "updated_at": as_utc(doc.get("updated_at"))})


@router.post("/enquiries", response_model=ContactEnquiry)
async def create_enquiry(payload: ContactEnquiryCreate):
    enquiry = ContactEnquiry(
        name=payload.name.strip(),
        email=payload.email.strip(),
        phone=payload.phone,
        subject=payload.subject,
        message=payload.message.strip(),
        status="new",
        created_at=_now(),
    )
    await db.contact_enquiries.insert_one(enquiry.model_dump())
    await notify_admins(
        "New contact enquiry",
        f"{enquiry.name} ({enquiry.email}): {enquiry.subject or 'General enquiry'}",
        "/admin/enquiries",
    )
    await audit(None, "enquiry.create", "contact_enquiry", enquiry.id, f"from={enquiry.email}")
    return enquiry
