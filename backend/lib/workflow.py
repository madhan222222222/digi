"""Shared application-stage workflow — used by both admin and employee routers."""

from datetime import datetime, timezone

from fastapi import HTTPException

from lib.auth import audit, notify
from lib.db import db

APPLICATION_STATUSES = [
    "applied",
    "under_review",
    "shortlisted",
    "interview_scheduled",
    "interview_completed",
    "selected",
    "not_selected",
    "offer_received",
    "joined",
    "closed",
]

STATUS_LABELS = {
    "applied": "Applied",
    "under_review": "Application Under Review",
    "shortlisted": "Shortlisted",
    "interview_scheduled": "Interview Scheduled",
    "interview_completed": "Interview Completed",
    "selected": "Selected",
    "not_selected": "Not Selected",
    "offer_received": "Offer Received",
    "joined": "Joined",
    "closed": "Closed",
}


def status_label(status: str) -> str:
    return STATUS_LABELS.get(status, status.replace("_", " ").title())


async def set_offer_decision(offer_doc: dict, decision: str, notes: str | None, actor: dict) -> dict:
    """Record a reviewer's decision on an offer-letter submission and notify the candidate."""
    if decision not in ("approved", "needs_resubmission", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid review decision")
    now = datetime.now(timezone.utc)
    await db.offer_submissions.update_one(
        {"id": offer_doc["id"]},
        {
            "$set": {
                "status": decision,
                "reviewed_by": actor.get("id"),
                "reviewed_by_name": actor.get("full_name"),
                "reviewed_at": now,
                "review_notes": notes,
                "updated_at": now,
            }
        },
    )
    titles = {
        "approved": "Placement verified",
        "needs_resubmission": "Offer submission needs corrections",
        "rejected": "Offer submission not approved",
    }
    await notify(
        offer_doc.get("candidate_id", ""),
        titles[decision],
        notes or f"Your offer submission for {offer_doc.get('company_name')} was reviewed by the DigiPhonics team.",
        "/dashboard/offers",
    )
    await audit(actor, "offer.review", "offer_submission", offer_doc["id"], f"decision={decision}")
    return await db.offer_submissions.find_one({"id": offer_doc["id"]})


async def set_application_status(app_doc: dict, new_status: str, note: str | None, actor: dict) -> dict:
    if new_status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid application status")
    now = datetime.now(timezone.utc)
    event = {
        "status": new_status,
        "note": note,
        "changed_by": actor.get("id"),
        "changed_by_name": actor.get("full_name"),
        "changed_at": now,
    }
    await db.applications.update_one(
        {"id": app_doc["id"]},
        {"$set": {"status": new_status, "updated_at": now}, "$push": {"status_history": event}},
    )
    await notify(
        app_doc.get("candidate_id", ""),
        f"Application update: {status_label(new_status)}",
        f"Your application for {app_doc.get('job_title')} at {app_doc.get('company_name')} moved to '{status_label(new_status)}'.",
        "/dashboard/applications",
    )
    await audit(actor, "application.status_update", "application", app_doc["id"], f"status={new_status}")
    return await db.applications.find_one({"id": app_doc["id"]})
