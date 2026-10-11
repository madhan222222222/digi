"""Candidate portal: profile management, dashboard summary, recommended openings."""

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import audit, get_current_user, require_roles
from lib.db import db
from lib.dates import today_iso
from lib.storage import as_utc, clean
from models.jobs import Job
from models.users import CANDIDATE_CATEGORIES, CandidateProfile, CandidateProfileUpdate, UserOut

router = APIRouter(prefix="/candidate", tags=["candidate"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def profile_completion(profile: dict) -> int:
    fields = [
        "current_location",
        "preferred_roles",
        "preferred_locations",
        "resume_file_id",
        "education",
        "skills",
    ]
    category = profile.get("category", "fresher")
    if category == "fresher":
        fields += ["graduation_year", "projects"]
    elif category == "non_it_to_it":
        fields += ["previous_industry", "transferable_skills"]
    elif category == "career_gap":
        fields += ["last_designation", "career_break_months"]
    elif category == "experienced":
        fields += ["total_experience_years", "current_designation"]

    filled = 0
    for field in fields:
        value = profile.get(field)
        if value is None:
            continue
        if isinstance(value, (list, str)) and len(value) == 0:
            continue
        filled += 1
    return round(filled / len(fields) * 100)


@router.get("/me")
async def candidate_me(user: dict = Depends(require_roles("candidate"))):
    profile = await db.candidate_profiles.find_one({"user_id": user["id"]})
    return {
        "user": UserOut(**{**clean(user), "created_at": as_utc(user.get("created_at"))}).model_dump(mode="json"),
        "profile": CandidateProfile(**{**profile, "created_at": as_utc(profile.get("created_at")), "updated_at": as_utc(profile.get("updated_at"))}).model_dump(mode="json") if profile else None,
    }


@router.put("/profile", response_model=CandidateProfile)
async def update_profile(payload: CandidateProfileUpdate, user: dict = Depends(require_roles("candidate"))):
    profile = await db.candidate_profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "category" in updates and updates["category"] not in CANDIDATE_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid candidate category")
    updates["updated_at"] = _now()
    await db.candidate_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    await audit(user, "candidate.profile_update", "candidate_profile", profile["id"], f"fields={list(updates.keys())}")
    updated = await db.candidate_profiles.find_one({"user_id": user["id"]})
    return CandidateProfile(**{**clean(updated), "created_at": as_utc(updated.get("created_at")), "updated_at": as_utc(updated.get("updated_at"))})


@router.get("/dashboard")
async def dashboard(user: dict = Depends(require_roles("candidate"))) -> dict[str, Any]:
    profile = await db.candidate_profiles.find_one({"user_id": user["id"]}) or {}
    apps = await db.applications.find({"candidate_id": user["id"]}).to_list(1000)
    by_status = dict(Counter(a["status"] for a in apps))
    saved = await db.saved_jobs.count_documents({"candidate_id": user["id"]})
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    bookmarks = await db.question_bookmarks.count_documents({"candidate_id": user["id"]})
    offers = await db.offer_submissions.find({"candidate_id": user["id"]}).sort("created_at", -1).to_list(50)

    app_ids = [a["id"] for a in apps]
    interviews = await db.interviews.find({"application_id": {"$in": app_ids}}).sort("scheduled_at", 1).to_list(50)
    now = _now()
    upcoming = []
    for i in interviews:
        scheduled = i["scheduled_at"]
        if scheduled.tzinfo is None:
            scheduled = scheduled.replace(tzinfo=timezone.utc)
        if scheduled >= now:
            upcoming.append(
                {
                    "id": i["id"],
                    "application_id": i["application_id"],
                    "scheduled_at": scheduled.isoformat(),
                    "timezone": i.get("timezone"),
                    "interview_type": i.get("interview_type"),
                    "meeting_link": i.get("meeting_link"),
                    "venue": i.get("venue"),
                    "interviewer_name": i.get("interviewer_name"),
                }
            )

    return {
        "profile_completion": profile_completion(profile),
        "counts": {
            "applications": len(apps),
            "saved_jobs": saved,
            "unread_notifications": unread,
            "bookmarks": bookmarks,
            "offers": len(offers),
            "verified_placements": len([o for o in offers if o.get("status") == "approved"]),
        },
        "applications_by_status": by_status,
        "upcoming_interviews": upcoming,
        "latest_offer": offers[0] if offers else None,
        "today": today_iso(),
    }


@router.get("/recommended-jobs", response_model=list[Job])
async def recommended_jobs(user: dict = Depends(require_roles("candidate"))):
    profile = await db.candidate_profiles.find_one({"user_id": user["id"]}) or {}
    today = today_iso()
    docs = await db.jobs.find({"status": "approved"}).sort("posted_at", -1).to_list(300)
    docs = [d for d in docs if not (d.get("application_deadline") and d["application_deadline"] < today)]

    skills = {s.lower() for s in (profile.get("skills") or [])}
    roles = {r.lower() for r in (profile.get("preferred_roles") or [])}
    category = profile.get("category")
    exp = profile.get("total_experience_years") or 0

    def score(d: dict) -> int:
        s = 0
        job_skills = {sk.lower() for sk in d.get("required_skills", [])}
        s += len(skills & job_skills) * 3
        title = (d.get("title") or "").lower()
        if any(r in title for r in roles):
            s += 4
        if category and category in d.get("candidate_categories", []):
            s += 2
        if d.get("min_experience", 0) <= exp and (d.get("max_experience") is None or d.get("max_experience") >= exp):
            s += 1
        return s

    docs = [d for d in docs if score(d) > 0]
    docs.sort(key=score, reverse=True)

    from routers.jobs import job_from_doc, mask_recruiter

    return [mask_recruiter(job_from_doc(d)) for d in docs[:6]]
