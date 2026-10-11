"""Application tracking: role-aware listing, stage updates, interview scheduling."""

import math
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import audit, get_current_user, notify, require_roles
from lib.db import db
from lib.storage import as_utc, clean
from lib.workflow import set_application_status
from models.applications import ApplicationStatusUpdate, Interview, InterviewCreate

router = APIRouter(prefix="/applications", tags=["applications"])


def app_out(doc: dict) -> dict:
    doc = clean(doc)
    doc["created_at"] = as_utc(doc.get("created_at"))
    doc["updated_at"] = as_utc(doc.get("updated_at"))
    doc["status_history"] = [
        {**event, "changed_at": as_utc(event.get("changed_at"))} for event in (doc.get("status_history") or [])
    ]
    return doc


async def assigned_application_ids(employee_id: str) -> list[str]:
    return await db.assignments.distinct(
        "target_id", {"employee_id": employee_id, "assignment_type": "application", "active": True}
    )


async def can_access_application(user: dict, doc: dict) -> bool:
    role = user.get("role")
    if role == "admin":
        return True
    if role == "candidate":
        return doc.get("candidate_id") == user["id"]
    if role == "employee":
        return doc["id"] in await assigned_application_ids(user["id"])
    return False


async def _load_application(app_id: str) -> dict:
    doc = await db.applications.find_one({"id": app_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return doc


@router.get("")
async def list_applications(
    status: str | None = None,
    job_id: str | None = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if user["role"] == "candidate":
        query["candidate_id"] = user["id"]
    elif user["role"] == "employee":
        ids = await assigned_application_ids(user["id"])
        query["id"] = {"$in": ids}
    if status:
        query["status"] = status
    if job_id:
        query["job_id"] = job_id

    docs = await db.applications.find(query).sort("created_at", -1).to_list(1000)
    candidate_ids = list({d["candidate_id"] for d in docs})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": candidate_ids}}).to_list(1000)}
    items = []
    for d in docs:
        out = app_out(d)
        u = users.get(d["candidate_id"], {})
        out["candidate_name"] = u.get("full_name")
        out["candidate_email"] = u.get("email")
        items.append(out)

    total = len(items)
    pages = max(1, math.ceil(total / limit))
    page = max(1, page)
    return {"items": items[(page - 1) * limit : page * limit], "total": total, "page": page, "pages": pages}


@router.get("/{app_id}")
async def get_application(app_id: str, user: dict = Depends(get_current_user)):
    doc = await _load_application(app_id)
    if not await can_access_application(user, doc):
        raise HTTPException(status_code=403, detail="Not authorized to view this application")
    return app_out(doc)


@router.post("/{app_id}/status")
async def update_status(
    app_id: str,
    payload: ApplicationStatusUpdate,
    user: dict = Depends(require_roles("admin", "employee")),
):
    doc = await _load_application(app_id)
    if user["role"] == "employee" and doc["id"] not in await assigned_application_ids(user["id"]):
        raise HTTPException(status_code=403, detail="You can only update applications assigned to you")
    updated = await set_application_status(doc, payload.status, payload.note, user)
    return app_out(updated)


@router.post("/{app_id}/interviews", response_model=Interview)
async def schedule_interview(
    app_id: str,
    payload: InterviewCreate,
    user: dict = Depends(require_roles("admin", "employee")),
):
    doc = await _load_application(app_id)
    if user["role"] == "employee" and doc["id"] not in await assigned_application_ids(user["id"]):
        raise HTTPException(status_code=403, detail="You can only schedule interviews for assigned applications")

    interview = Interview(
        application_id=app_id,
        scheduled_at=payload.scheduled_at,
        timezone=payload.timezone,
        interview_type=payload.interview_type,
        meeting_link=payload.meeting_link,
        venue=payload.venue,
        interviewer_name=payload.interviewer_name,
        interviewer_designation=payload.interviewer_designation,
        created_by=user["id"],
    )
    await db.interviews.insert_one(interview.model_dump())
    note = f"Interview scheduled for {payload.scheduled_at.strftime('%d %b %Y, %H:%M')} ({payload.timezone})"
    await set_application_status(doc, "interview_scheduled", note, user)
    details = f"Your interview for {doc.get('job_title')} at {doc.get('company_name')} is scheduled on {payload.scheduled_at.strftime('%d %b %Y, %H:%M')} ({payload.timezone}). Type: {payload.interview_type}."
    if payload.meeting_link:
        details += f" Meeting link: {payload.meeting_link}"
    if payload.venue:
        details += f" Venue: {payload.venue}"
    await notify(doc["candidate_id"], "Interview scheduled", details, "/dashboard/applications")
    await audit(user, "interview.schedule", "application", app_id, note)
    return interview


@router.get("/{app_id}/interviews", response_model=list[Interview])
async def list_interviews(app_id: str, user: dict = Depends(get_current_user)):
    doc = await _load_application(app_id)
    if not await can_access_application(user, doc):
        raise HTTPException(status_code=403, detail="Not authorized to view this application")
    docs = await db.interviews.find({"application_id": app_id}).sort("scheduled_at", 1).to_list(100)
    return [
        Interview(**{**clean(d), "scheduled_at": as_utc(d.get("scheduled_at")), "created_at": as_utc(d.get("created_at"))})
        for d in docs
    ]
