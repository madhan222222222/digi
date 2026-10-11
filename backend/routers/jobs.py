"""Public job portal + candidate save/apply actions."""

import math
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from lib.auth import audit, get_optional_user, notify, notify_admins, require_roles
from lib.db import db
from lib.dates import today_iso
from lib.storage import as_utc, clean
from models.applications import Application, ApplicationCreate
from models.jobs import Job
from models.users import CANDIDATE_CATEGORIES

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def job_from_doc(doc: dict) -> Job:
    doc = clean(doc)
    for key in ("posted_at", "updated_at", "reviewed_at"):
        doc[key] = as_utc(doc.get(key))
    return Job(**doc)


def mask_recruiter(job: Job) -> Job:
    """Recruiter/HR contact details are visible to staff and the posting employer only."""
    job.recruiter_name = None
    job.recruiter_designation = None
    job.recruiter_email = None
    job.recruiter_phone = None
    return job


def is_expired(doc: dict) -> bool:
    deadline = doc.get("application_deadline")
    return bool(deadline and deadline < today_iso())


def _escape(text: str) -> str:
    import re as _re

    return _re.escape(text)


@router.get("")
async def list_jobs(
    request: Request,
    q: str | None = None,
    category: str | None = None,
    work_mode: str | None = None,
    employment_type: str | None = None,
    location: str | None = None,
    tech: str | None = None,
    experience: float | None = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 10,
) -> dict[str, Any]:
    query: dict[str, Any] = {"status": "approved"}
    if q:
        query["$or"] = [
            {"title": _contains(q)},
            {"company_name": _contains(q)},
            {"description": _contains(q)},
            {"required_skills": _contains(q)},
        ]
    if category:
        if category not in CANDIDATE_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid candidate category filter")
        query["candidate_categories"] = category
    if work_mode:
        query["work_mode"] = work_mode
    if employment_type:
        query["employment_type"] = employment_type
    if location:
        query["location"] = _contains(location)
    if tech:
        query["required_skills"] = _contains(tech)
    if experience is not None:
        query["min_experience"] = {"$lte": experience}
        query["$and"] = [{"$or": [{"max_experience": None}, {"max_experience": {"$gte": experience}}]}]

    docs = await db.jobs.find(query).sort("posted_at", -1).to_list(500)
    docs = [d for d in docs if not is_expired(d)]

    if sort == "relevance" and q:
        ql = q.lower()

        def score(d: dict) -> int:
            s = 0
            if ql in (d.get("title") or "").lower():
                s += 3
            if ql in (d.get("company_name") or "").lower():
                s += 2
            if ql in " ".join(d.get("required_skills", [])).lower():
                s += 2
            if ql in (d.get("description") or "").lower():
                s += 1
            return s

        docs.sort(key=score, reverse=True)

    total = len(docs)
    pages = max(1, math.ceil(total / limit))
    page = max(1, page)
    items = docs[(page - 1) * limit : page * limit]
    return {
        "items": [mask_recruiter(job_from_doc(d)).model_dump(mode="json") for d in items],
        "total": total,
        "page": page,
        "pages": pages,
    }


@router.get("/saved", response_model=list[Job])
async def list_saved(user: dict = Depends(require_roles("candidate"))):
    saved = await db.saved_jobs.find({"candidate_id": user["id"]}).sort("created_at", -1).to_list(500)
    job_ids = [s["job_id"] for s in saved]
    docs = await db.jobs.find({"id": {"$in": job_ids}}).to_list(500)
    return [mask_recruiter(job_from_doc(d)) for d in docs]


@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str, request: Request):
    doc = await db.jobs.find_one({"id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    user = await get_optional_user(request)
    staff = user and user.get("role") in ("admin", "employee")
    owner = user and doc.get("employer_id") == user.get("id")
    if doc["status"] != "approved" and not (staff or owner):
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_from_doc(doc)
    if staff or owner:
        return job
    return mask_recruiter(job)


@router.post("/{job_id}/save")
async def save_job(job_id: str, user: dict = Depends(require_roles("candidate"))):
    job = await db.jobs.find_one({"id": job_id, "status": "approved"})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.saved_jobs.update_one(
        {"candidate_id": user["id"], "job_id": job_id},
        {"$setOnInsert": {"created_at": _now()}},
        upsert=True,
    )
    return {"ok": True}


@router.delete("/{job_id}/save")
async def unsave_job(job_id: str, user: dict = Depends(require_roles("candidate"))):
    await db.saved_jobs.delete_one({"candidate_id": user["id"], "job_id": job_id})
    return {"ok": True}


@router.post("/{job_id}/apply", response_model=Application)
async def apply(
    job_id: str,
    payload: ApplicationCreate | None = None,
    user: dict = Depends(require_roles("candidate")),
):
    job = await db.jobs.find_one({"id": job_id, "status": "approved"})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if is_expired(job):
        raise HTTPException(status_code=400, detail="The application deadline for this job has passed")
    existing = await db.applications.find_one(
        {
            "job_id": job_id,
            "candidate_id": user["id"],
            "status": {"$nin": ["closed", "not_selected"]},
        }
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    profile = await db.candidate_profiles.find_one({"user_id": user["id"]})
    now = _now()
    application = Application(
        job_id=job_id,
        candidate_id=user["id"],
        job_title=job["title"],
        company_name=job["company_name"],
        cover_note=payload.cover_note if payload else None,
        resume_file_id=(profile or {}).get("resume_file_id"),
        status="applied",
        status_history=[
            {"status": "applied", "note": None, "changed_by": user["id"], "changed_by_name": user.get("full_name"), "changed_at": now}
        ],
        created_at=now,
        updated_at=now,
    )
    await db.applications.insert_one(application.model_dump())
    await notify(
        user["id"],
        "Application submitted",
        f"Your application for {job['title']} at {job['company_name']} was submitted successfully.",
        "/dashboard/applications",
    )
    await notify_admins(
        "New job application",
        f"{user.get('full_name')} applied for {job['title']} at {job['company_name']}.",
        "/admin/applications",
    )
    await audit(user, "application.create", "application", application.id, f"job={job_id}")
    return application
