"""Placement / offer-letter submissions — private documents, permission-checked access."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import audit, get_current_user, notify_admins, require_roles
from lib.db import db
from lib.storage import as_utc, clean
from lib.workflow import set_offer_decision
from models.offers import OfferCreate, OfferResubmit, OfferSubmission

router = APIRouter(prefix="/offers", tags=["offers"])


def offer_out(doc: dict) -> dict:
    doc = clean(doc)
    doc["created_at"] = as_utc(doc.get("created_at"))
    doc["updated_at"] = as_utc(doc.get("updated_at"))
    doc["reviewed_at"] = as_utc(doc.get("reviewed_at"))
    return doc


async def _load(offer_id: str) -> dict:
    doc = await db.offer_submissions.find_one({"id": offer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Offer submission not found")
    return doc


async def assigned_offer_ids(employee_id: str) -> list[str]:
    return await db.assignments.distinct(
        "target_id", {"employee_id": employee_id, "assignment_type": "offer", "active": True}
    )


async def can_access_offer(user: dict, doc: dict) -> bool:
    role = user.get("role")
    if role == "admin":
        return True
    if role == "candidate":
        return doc.get("candidate_id") == user["id"]
    if role == "employee":
        return doc["id"] in await assigned_offer_ids(user["id"])
    return False


@router.post("", response_model=OfferSubmission)
async def create_offer(payload: OfferCreate, user: dict = Depends(require_roles("candidate"))):
    file = await db.files.find_one({"id": payload.offer_letter_file_id, "uploader_id": user["id"]})
    if not file:
        raise HTTPException(status_code=400, detail="Upload the offer letter (PDF) first")

    offer = OfferSubmission(candidate_id=user["id"], **payload.model_dump())
    await db.offer_submissions.insert_one(offer.model_dump())
    await notify_admins(
        "New offer-letter submission",
        f"{user.get('full_name')} submitted an offer from {payload.company_name} for verification.",
        "/admin/offers",
    )
    await audit(user, "offer.submit", "offer_submission", offer.id, f"company={payload.company_name}")
    return offer


@router.get("")
async def list_offers(
    status: str | None = None,
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if user["role"] == "candidate":
        query["candidate_id"] = user["id"]
    elif user["role"] == "employee":
        ids = await assigned_offer_ids(user["id"])
        query["id"] = {"$in": ids}
    if status:
        query["status"] = status

    docs = await db.offer_submissions.find(query).sort("created_at", -1).to_list(500)
    candidate_ids = list({d["candidate_id"] for d in docs})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": candidate_ids}}).to_list(1000)}
    items = []
    for d in docs:
        out = offer_out(d)
        u = users.get(d["candidate_id"], {})
        out["candidate_name"] = u.get("full_name")
        out["candidate_email"] = u.get("email")
        items.append(out)
    return {"items": items, "total": len(items)}


@router.get("/{offer_id}")
async def get_offer(offer_id: str, user: dict = Depends(get_current_user)):
    doc = await _load(offer_id)
    if not await can_access_offer(user, doc):
        raise HTTPException(status_code=403, detail="Not authorized to view this offer submission")
    return offer_out(doc)


@router.put("/{offer_id}", response_model=OfferSubmission)
async def resubmit_offer(offer_id: str, payload: OfferResubmit, user: dict = Depends(require_roles("candidate"))):
    doc = await _load(offer_id)
    if doc.get("candidate_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if doc.get("status") != "needs_resubmission":
        raise HTTPException(status_code=400, detail="This submission cannot be edited right now")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates.update({"status": "pending", "updated_at": _now()})
    if payload.offer_letter_file_id:
        file = await db.files.find_one({"id": payload.offer_letter_file_id, "uploader_id": user["id"]})
        if not file:
            raise HTTPException(status_code=400, detail="Invalid offer letter file")
    await db.offer_submissions.update_one({"id": offer_id}, {"$set": updates})
    await notify_admins(
        "Offer submission resubmitted",
        f"{user.get('full_name')} resubmitted their offer from {doc.get('company_name')} for review.",
        "/admin/offers",
    )
    await audit(user, "offer.resubmit", "offer_submission", offer_id)
    updated = await _load(offer_id)
    return OfferSubmission(**offer_out(updated))


@router.post("/{offer_id}/review", response_model=OfferSubmission)
async def review_offer(
    offer_id: str,
    payload: dict,
    user: dict = Depends(require_roles("admin", "employee")),
):
    doc = await _load(offer_id)
    if user["role"] == "employee" and doc["id"] not in await assigned_offer_ids(user["id"]):
        raise HTTPException(status_code=403, detail="You can only review offers assigned to you")
    decision = payload.get("decision", "")
    notes = payload.get("notes")
    updated = await set_offer_decision(doc, decision, notes, user)
    return OfferSubmission(**offer_out(updated))
