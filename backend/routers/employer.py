"""Employer submissions: public job-posting form (or logged-in employer account).
Every submission lands as status=pending and appears publicly only after admin approval."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from lib.auth import audit, get_optional_user, notify, notify_admins, require_roles
from lib.db import db
from lib.storage import as_utc
from models.jobs import Job, JobCreate, JobUpdate

router = APIRouter(prefix="/employer", tags=["employer"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/submissions", response_model=Job)
async def create_submission(payload: JobCreate, request: Request):
    user = await get_optional_user(request)
    if user and user["role"] in ("admin", "employee"):
        raise HTTPException(status_code=403, detail="Staff must use the admin portal to post jobs")

    now = _now()
    doc = payload.model_dump()
    doc.update(
        {
            "id": str(uuid.uuid4()),
            "status": "pending",
            "verification_status": "unverified",
            "source": "employer_submission",
            "employer_id": user["id"] if user and user["role"] == "employer" else None,
            "submission_email": payload.recruiter_email or (user["email"] if user else None),
            "posted_at": now,
            "updated_at": now,
        }
    )
    await db.jobs.insert_one(doc)
    await notify_admins(
        "New employer job submission",
        f"{payload.company_name} submitted '{payload.title}' and it is awaiting review.",
        "/admin/jobs",
    )
    await audit(user, "job.submit", "job", doc["id"], f"company={payload.company_name}; title={payload.title}")
    return Job(**doc)


@router.get("/submissions", response_model=list[Job])
async def my_submissions(user: dict = Depends(require_roles("employer"))):
    docs = await db.jobs.find({"employer_id": user["id"]}).sort("posted_at", -1).to_list(500)
    return [Job(**{**d, "posted_at": as_utc(d.get("posted_at")), "updated_at": as_utc(d.get("updated_at")), "reviewed_at": as_utc(d.get("reviewed_at"))}) for d in docs]


@router.put("/submissions/{job_id}", response_model=Job)
async def update_submission(job_id: str, payload: JobUpdate, user: dict = Depends(require_roles("employer"))):
    doc = await db.jobs.find_one({"id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if doc.get("employer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own job listings")
    if doc["status"] in ("closed", "archived"):
        raise HTTPException(status_code=400, detail="Closed or archived listings cannot be edited")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = _now()
    if doc["status"] == "approved":
        # An edited public listing goes back to pending for re-review.
        updates["status"] = "pending"
        updates["review_notes"] = "Edited by employer; pending re-review."
    await db.jobs.update_one({"id": job_id}, {"$set": updates})
    await audit(user, "job.employer_edit", "job", job_id, f"fields={list(updates.keys())}")
    updated = await db.jobs.find_one({"id": job_id})
    return Job(**{**updated, "posted_at": as_utc(updated.get("posted_at")), "updated_at": as_utc(updated.get("updated_at")), "reviewed_at": as_utc(updated.get("reviewed_at"))})
