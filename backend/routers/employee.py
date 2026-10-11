"""Employee portal: own profile, documents, virtual ID card, assigned work."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from lib.auth import audit, get_current_user, notify, require_roles
from lib.db import db
from lib.storage import as_utc, clean
from lib.workflow import set_application_status
from models.jobs import Job
from models.users import EmployeeProfile, OnboardingDetails, UserOut

router = APIRouter(prefix="/employee", tags=["employee"])

staff = require_roles("employee", "admin")
employee_only = require_roles("employee")

REQUIRED_DOC_TYPES = ["aadhaar", "pan", "certificate"]


class EmployeeSelfUpdate(BaseModel):
    designation: str | None = None
    department: str | None = None
    phone: str | None = None


class DocumentCreate(BaseModel):
    file_id: str
    doc_type: str
    label: str | None = None


class CandidateMessage(BaseModel):
    application_id: str
    title: str
    body: str | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def ensure_profile(user: dict) -> dict:
    profile = await db.employee_profiles.find_one({"user_id": user["id"]})
    if not profile:
        count = await db.employee_profiles.count_documents({})
        profile = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "employee_code": f"DP-E-{count + 1:04d}",
            "designation": None,
            "department": None,
            "verification_status": "pending",
            "documents": [],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.employee_profiles.insert_one(profile)
    return profile


def profile_out(doc: dict) -> dict:
    doc = clean(doc)
    doc["created_at"] = as_utc(doc.get("created_at"))
    doc["updated_at"] = as_utc(doc.get("updated_at"))
    return doc


async def assigned_ids(user: dict, assignment_type: str) -> list[str]:
    return await db.assignments.distinct(
        "target_id", {"employee_id": user["id"], "assignment_type": assignment_type, "active": True}
    )


@router.get("/me")
async def employee_me(user: dict = Depends(staff)):
    profile = await ensure_profile(user)
    return {
        "user": UserOut(**{**clean(user), "created_at": as_utc(user.get("created_at"))}).model_dump(mode="json"),
        "profile": profile_out(profile),
    }


@router.put("/me")
async def update_employee_me(payload: EmployeeSelfUpdate, user: dict = Depends(employee_only)):
    profile = await ensure_profile(user)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    user_updates = {}
    if "phone" in updates:
        user_updates["phone"] = updates.pop("phone")
    if updates:
        updates["updated_at"] = _now()
        await db.employee_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    if user_updates:
        await db.users.update_one({"id": user["id"]}, {"$set": user_updates})
    await audit(user, "employee.profile_update", "employee_profile", profile["id"])
    return {"user": UserOut(**{**clean(user), **user_updates, "created_at": as_utc(user.get("created_at"))}).model_dump(mode="json"), "profile": profile_out(await db.employee_profiles.find_one({"user_id": user["id"]}))}


@router.post("/documents")
async def add_document(payload: DocumentCreate, user: dict = Depends(employee_only)):
    profile = await ensure_profile(user)
    file = await db.files.find_one({"id": payload.file_id, "uploader_id": user["id"]})
    if not file:
        raise HTTPException(status_code=400, detail="Upload the document file first")
    doc = {
        "id": str(uuid.uuid4()),
        "doc_type": payload.doc_type,
        "file_id": payload.file_id,
        "label": payload.label,
        "verification_status": "pending",
        "uploaded_at": _now(),
    }
    await db.employee_profiles.update_one(
        {"user_id": user["id"]}, {"$push": {"documents": doc}, "$set": {"updated_at": _now()}}
    )
    await audit(user, "employee.document_upload", "employee_profile", profile["id"], f"doc_type={payload.doc_type}")
    return profile_out(await db.employee_profiles.find_one({"user_id": user["id"]}))


@router.put("/onboarding/details")
async def save_onboarding_details(payload: OnboardingDetails, user: dict = Depends(employee_only)):
    """Step 1 — personal details. Documents (step 2) unlock only after this is saved."""
    profile = await ensure_profile(user)
    if profile.get("verification_status") == "approved":
        raise HTTPException(status_code=400, detail="Your onboarding is already approved")
    updates = {
        "father_name": payload.father_name.strip(),
        "mother_name": payload.mother_name.strip(),
        "date_of_birth": payload.date_of_birth,
        "address": payload.address.strip(),
        "emergency_contact": payload.emergency_contact,
        "designation": payload.designation,
        "photo_file_id": payload.photo_file_id,
        "onboarding_step": max(2, int(profile.get("onboarding_step") or 1)),
        "updated_at": _now(),
    }
    await db.employee_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"full_name": payload.full_name.strip(), "phone": payload.phone}}
    )
    await audit(user, "employee.onboarding_details", "employee_profile", profile["id"])
    return profile_out(await db.employee_profiles.find_one({"user_id": user["id"]}))


@router.post("/onboarding/submit")
async def submit_onboarding(user: dict = Depends(employee_only)):
    """Step 3 — send the completed onboarding to the admin. Approval is admin-only."""
    profile = await ensure_profile(user)
    if profile.get("verification_status") == "approved":
        raise HTTPException(status_code=400, detail="Your onboarding is already approved")
    if not profile.get("father_name") or not profile.get("mother_name") or not profile.get("date_of_birth"):
        raise HTTPException(status_code=400, detail="Complete your personal details first")
    types = {d.get("doc_type") for d in (profile.get("documents") or [])}
    missing = [t for t in REQUIRED_DOC_TYPES if t not in types]
    if missing:
        raise HTTPException(status_code=400, detail=f"Upload these documents first: {', '.join(missing)}")
    await db.employee_profiles.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "verification_status": "submitted",
                "onboarding_step": 3,
                "submitted_at": _now(),
                "review_note": None,
                "updated_at": _now(),
            }
        },
    )
    for admin_user in await db.users.find({"role": "admin"}).to_list(50):
        await notify(
            admin_user["id"],
            "Employee onboarding submitted",
            f"{user.get('full_name')} submitted onboarding details and documents for approval.",
            "/admin/employees",
        )
    await audit(user, "employee.onboarding_submit", "employee_profile", profile["id"])
    return profile_out(await db.employee_profiles.find_one({"user_id": user["id"]}))


@router.get("/id-card")
async def id_card(user: dict = Depends(employee_only)):
    profile = await ensure_profile(user)
    if profile.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Your virtual ID card is issued after an admin approves you")
    return {
        "employee_code": profile.get("employee_code"),
        "full_name": user.get("full_name"),
        "designation": profile.get("designation"),
        "department": profile.get("department"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "photo_file_id": profile.get("photo_file_id"),
        "working_days": profile.get("working_days") or [],
        "company": "DigiPhonics Technology",
        "issued": True,
    }


@router.get("/assignments")
async def my_assignments(user: dict = Depends(employee_only)):
    rows = await db.assignments.find({"employee_id": user["id"], "active": True}).sort("created_at", -1).to_list(200)
    return [{**r, "created_at": as_utc(r.get("created_at"))} for r in rows]


@router.get("/assigned/jobs", response_model=list[Job])
async def assigned_jobs(user: dict = Depends(employee_only)):
    ids = await assigned_ids(user, "job")
    if not ids:
        return []
    docs = await db.jobs.find({"id": {"$in": ids}}).sort("posted_at", -1).to_list(200)
    return [
        Job(**{**clean(d), "posted_at": as_utc(d.get("posted_at")), "updated_at": as_utc(d.get("updated_at")), "reviewed_at": as_utc(d.get("reviewed_at"))})
        for d in docs
    ]


@router.get("/assigned/applications")
async def assigned_applications(user: dict = Depends(employee_only)) -> dict[str, Any]:
    ids = await assigned_ids(user, "application")
    if not ids:
        return {"items": [], "total": 0}
    docs = await db.applications.find({"id": {"$in": ids}}).sort("created_at", -1).to_list(200)
    docs = [{**clean(d), "created_at": as_utc(d.get("created_at")), "updated_at": as_utc(d.get("updated_at")), "status_history": [{**clean(e), "changed_at": as_utc(e.get("changed_at"))} for e in (d.get("status_history") or [])]} for d in docs]
    candidate_ids = list({d["candidate_id"] for d in docs})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": candidate_ids}}).to_list(1000)}
    for d in docs:
        u = users.get(d["candidate_id"], {})
        d["candidate_name"] = u.get("full_name")
        d["candidate_email"] = u.get("email")
    return {"items": docs, "total": len(docs)}


@router.get("/assigned/offers")
async def assigned_offers(user: dict = Depends(employee_only)) -> dict[str, Any]:
    ids = await assigned_ids(user, "offer")
    if not ids:
        return {"items": [], "total": 0}
    docs = await db.offer_submissions.find({"id": {"$in": ids}}).sort("created_at", -1).to_list(200)
    docs = [{**clean(d), "created_at": as_utc(d.get("created_at")), "updated_at": as_utc(d.get("updated_at")), "reviewed_at": as_utc(d.get("reviewed_at"))} for d in docs]
    candidate_ids = list({d["candidate_id"] for d in docs})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": candidate_ids}}).to_list(1000)}
    for d in docs:
        u = users.get(d["candidate_id"], {})
        d["candidate_name"] = u.get("full_name")
        d["candidate_email"] = u.get("email")
    return {"items": docs, "total": len(docs)}


@router.post("/applications/{app_id}/status")
async def update_application_status(app_id: str, payload: dict, user: dict = Depends(employee_only)):
    doc = await db.applications.find_one({"id": app_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_id not in await assigned_ids(user, "application"):
        raise HTTPException(status_code=403, detail="You can only update applications assigned to you")
    status = payload.get("status", "")
    note = payload.get("note")
    updated = await set_application_status(doc, status, note, user)
    updated["created_at"] = as_utc(updated.get("created_at"))
    updated["updated_at"] = as_utc(updated.get("updated_at"))
    return updated


@router.post("/notifications")
async def send_candidate_notification(payload: CandidateMessage, user: dict = Depends(employee_only)):
    app_doc = await db.applications.find_one({"id": payload.application_id})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
    if payload.application_id not in await assigned_ids(user, "application"):
        raise HTTPException(status_code=403, detail="You can only message candidates on applications assigned to you")
    await notify(
        app_doc["candidate_id"],
        payload.title,
        payload.body,
        "/dashboard/applications",
    )
    await audit(user, "employee.notify_candidate", "application", payload.application_id)
    return {"ok": True}
