"""Admin portal API — every route requires role=admin. Authorization is enforced here, not in the UI."""

import csv
import io
import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from lib.auth import audit, notify, require_roles
from lib.db import db
from lib.dates import today_iso
from lib.security import hash_password
from lib.storage import as_utc, clean
from lib.workflow import set_application_status, set_offer_decision
from models.fees import (
    DisputeUpdate,
    FeeRecord,
    FeeRecordCreate,
    PaymentConfirm,
    ServiceConfig,
    ServiceConfigCreate,
    ServiceConfigUpdate,
)
from models.jobs import Job, JobModerate, JobUpdate, JobVerify
from models.offers import OfferSubmission
from models.questions import DIFFICULTIES, QUESTION_TYPES, Question, QuestionCreate, QuestionUpdate
from models.users import WORKING_DAYS, EmployeeProfile, UserOut

router = APIRouter(prefix="/admin", tags=["admin"])
admin = require_roles("admin")


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- stats


@router.get("/stats")
async def stats(user: dict = Depends(admin)) -> dict[str, Any]:
    week_ago = _now() - timedelta(days=7)

    cat_rows = await db.candidate_profiles.aggregate(
        [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    ).to_list(10)
    stage_rows = await db.applications.aggregate(
        [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    ).to_list(20)
    fee_rows = await db.fee_records.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]).to_list(10)

    now_aware = _now()
    upcoming = await db.interviews.count_documents({"scheduled_at": {"$gte": now_aware}})

    return {
        "total_candidates": await db.users.count_documents({"role": "candidate"}),
        "candidates_by_category": {r["_id"]: r["count"] for r in cat_rows},
        "new_candidates_7d": await db.users.count_documents({"role": "candidate", "created_at": {"$gte": week_ago}}),
        "pending_job_submissions": await db.jobs.count_documents({"status": "pending"}),
        "jobs_published": await db.jobs.count_documents({"status": "approved"}),
        "jobs_closed": await db.jobs.count_documents({"status": {"$in": ["closed", "archived"]}}),
        "applications_by_stage": {r["_id"]: r["count"] for r in stage_rows},
        "upcoming_interviews": upcoming,
        "offers_submitted": await db.offer_submissions.count_documents({}),
        "offers_pending": await db.offer_submissions.count_documents({"status": "pending"}),
        "placements_verified": await db.offer_submissions.count_documents({"status": "approved"}),
        "fee_records_by_status": {r["_id"]: r["count"] for r in fee_rows},
        "disputes_open": await db.fee_records.count_documents({"status": "disputed"}),
        "questions_total": await db.questions.count_documents({}),
        "questions_published": await db.questions.count_documents({"published": True}),
        "enquiries_new": await db.contact_enquiries.count_documents({"status": "new"}),
        "employees": await db.users.count_documents({"role": "employee"}),
        "today": today_iso(),
    }


# ---------------------------------------------------------------- jobs moderation


@router.get("/jobs")
async def admin_jobs(
    status: str | None = None,
    q: str | None = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(admin),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if status:
        query["status"] = status
    if q:
        rx = {"$regex": q.replace("+", "\\+").replace("(", "\\(").replace(")", "\\)"), "$options": "i"}
        query["$or"] = [{"title": rx}, {"company_name": rx}]
    total = await db.jobs.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    page = max(1, page)
    docs = (
        await db.jobs.find(query)
        .sort("posted_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
        .to_list(limit)
    )
    items = [
        Job(**{**clean(d), "posted_at": as_utc(d.get("posted_at")), "updated_at": as_utc(d.get("updated_at")), "reviewed_at": as_utc(d.get("reviewed_at"))}).model_dump(mode="json")
        for d in docs
    ]
    return {"items": items, "total": total, "page": page, "pages": pages}


@router.put("/jobs/{job_id}", response_model=Job)
async def admin_edit_job(job_id: str, payload: JobUpdate, user: dict = Depends(admin)):
    doc = await db.jobs.find_one({"id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = _now()
    await db.jobs.update_one({"id": job_id}, {"$set": updates})
    await audit(user, "job.edit", "job", job_id, f"fields={list(updates.keys())}")
    updated = await db.jobs.find_one({"id": job_id})
    return Job(**{**clean(updated), "posted_at": as_utc(updated.get("posted_at")), "updated_at": as_utc(updated.get("updated_at")), "reviewed_at": as_utc(updated.get("reviewed_at"))})


@router.post("/jobs/{job_id}/moderate", response_model=Job)
async def moderate_job(job_id: str, payload: JobModerate, user: dict = Depends(admin)):
    doc = await db.jobs.find_one({"id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    now = _now()
    updates = {
        "status": payload.status,
        "reviewed_by": user["id"],
        "reviewed_at": now,
        "review_notes": payload.notes,
        "updated_at": now,
    }
    await db.jobs.update_one({"id": job_id}, {"$set": updates})
    if doc.get("employer_id"):
        labels = {"approved": "approved and published", "rejected": "rejected", "paused": "paused", "closed": "closed", "archived": "archived"}
        await notify(
            doc["employer_id"],
            f"Job listing {labels.get(payload.status, payload.status)}",
            f"Your listing '{doc.get('title')}' at {doc.get('company_name')} was {labels.get(payload.status, payload.status)} by the DigiPhonics team." + (f" Notes: {payload.notes}" if payload.notes else ""),
            "/employer",
        )
    await audit(user, f"job.{payload.status}", "job", job_id, payload.notes or "")
    updated = await db.jobs.find_one({"id": job_id})
    return Job(**{**clean(updated), "posted_at": as_utc(updated.get("posted_at")), "updated_at": as_utc(updated.get("updated_at")), "reviewed_at": as_utc(updated.get("reviewed_at"))})


@router.post("/jobs/{job_id}/verify", response_model=Job)
async def verify_job(job_id: str, payload: JobVerify, user: dict = Depends(admin)):
    doc = await db.jobs.find_one({"id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"verification_status": payload.verification_status, "updated_at": _now()}},
    )
    await audit(user, f"job.verify_{payload.verification_status}", "job", job_id, payload.notes or "")
    updated = await db.jobs.find_one({"id": job_id})
    return Job(**{**clean(updated), "posted_at": as_utc(updated.get("posted_at")), "updated_at": as_utc(updated.get("updated_at")), "reviewed_at": as_utc(updated.get("reviewed_at"))})


# ---------------------------------------------------------------- questions


@router.get("/questions")
async def admin_questions(
    q: str | None = None,
    category: str | None = None,
    published: bool | None = None,
    page: int = 1,
    limit: int = 15,
    user: dict = Depends(admin),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if q:
        rx = {"$regex": q.replace("+", "\\+"), "$options": "i"}
        query["$or"] = [{"question": rx}, {"topic": rx}, {"tags": rx}]
    if category:
        query["category"] = category
    if published is not None:
        query["published"] = published
    total = await db.questions.count_documents(query)
    pages = max(1, math.ceil(total / limit))
    page = max(1, page)
    docs = (
        await db.questions.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
        .to_list(limit)
    )
    items = [Question(**{**clean(d), "created_at": as_utc(d.get("created_at")), "updated_at": as_utc(d.get("updated_at"))}).model_dump(mode="json") for d in docs]
    return {"items": items, "total": total, "page": page, "pages": pages}


@router.post("/questions", response_model=Question)
async def create_question(payload: QuestionCreate, user: dict = Depends(admin)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": _now(), "updated_at": _now()})
    await db.questions.insert_one(doc)
    await audit(user, "question.create", "question", doc["id"], f"category={payload.category}")
    return Question(**doc)


@router.put("/questions/{question_id}", response_model=Question)
async def update_question(question_id: str, payload: QuestionUpdate, user: dict = Depends(admin)):
    doc = await db.questions.find_one({"id": question_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = _now()
    await db.questions.update_one({"id": question_id}, {"$set": updates})
    await audit(user, "question.update", "question", question_id, f"fields={list(updates.keys())}")
    updated = await db.questions.find_one({"id": question_id})
    return Question(**{**clean(updated), "created_at": as_utc(updated.get("created_at")), "updated_at": as_utc(updated.get("updated_at"))})


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str, user: dict = Depends(admin)):
    result = await db.questions.delete_one({"id": question_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Question not found")
    await audit(user, "question.delete", "question", question_id)
    return {"ok": True}


@router.post("/questions/import")
async def import_questions(file: UploadFile, user: dict = Depends(admin)):
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded")
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    imported = 0
    errors: list[dict[str, Any]] = []
    for i, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        question = (row.get("question") or "").strip()
        category = (row.get("category") or "").strip()
        if not question or not category:
            errors.append({"row": i, "error": "columns 'question' and 'category' are required"})
            continue
        difficulty = (row.get("difficulty") or "medium").strip().lower()
        if difficulty not in DIFFICULTIES:
            errors.append({"row": i, "error": f"invalid difficulty '{difficulty}' (easy|medium|hard)"})
            continue
        qtype = (row.get("question_type") or "conceptual").strip().lower()
        if qtype not in QUESTION_TYPES:
            errors.append({"row": i, "error": f"invalid question_type '{qtype}' (conceptual|coding|mcq|behavioral)"})
            continue
        options = [o.strip() for o in (row.get("options") or "").split("|") if o.strip()]
        tags = [t.strip() for t in (row.get("tags") or "").split("|") if t.strip()]
        published = (row.get("published") or "true").strip().lower() not in ("false", "0", "no")
        q = QuestionCreate(
            question=question,
            category=category,
            topic=(row.get("topic") or "").strip() or None,
            difficulty=difficulty,
            question_type=qtype,
            answer=(row.get("answer") or "").strip() or None,
            explanation=(row.get("explanation") or "").strip() or None,
            example=(row.get("example") or "").strip() or None,
            options=options,
            tags=tags,
            published=published,
        )
        doc = q.model_dump()
        doc.update({"id": str(uuid.uuid4()), "created_at": _now(), "updated_at": _now()})
        await db.questions.insert_one(doc)
        imported += 1
    await audit(user, "question.import", "question", None, f"imported={imported}; errors={len(errors)}")
    return {"imported": imported, "errors": errors}


# ---------------------------------------------------------------- offers


@router.get("/offers")
async def admin_offers(status: str | None = None, user: dict = Depends(admin)) -> dict[str, Any]:
    query = {"status": status} if status else {}
    docs = await db.offer_submissions.find(query).sort("created_at", -1).to_list(500)
    docs = [{**clean(d), "created_at": as_utc(d.get("created_at")), "updated_at": as_utc(d.get("updated_at")), "reviewed_at": as_utc(d.get("reviewed_at"))} for d in docs]
    candidate_ids = list({d["candidate_id"] for d in docs})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": candidate_ids}}).to_list(1000)}
    for d in docs:
        u = users.get(d["candidate_id"], {})
        d["candidate_name"] = u.get("full_name")
        d["candidate_email"] = u.get("email")
    return {"items": docs, "total": len(docs)}


@router.post("/offers/{offer_id}/review", response_model=OfferSubmission)
async def review_offer(offer_id: str, payload: dict, user: dict = Depends(admin)):
    doc = await db.offer_submissions.find_one({"id": offer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Offer submission not found")
    updated = await set_offer_decision(doc, payload.get("decision", ""), payload.get("notes"), user)
    return OfferSubmission(**{**clean(updated), "created_at": as_utc(updated.get("created_at")), "updated_at": as_utc(updated.get("updated_at")), "reviewed_at": as_utc(updated.get("reviewed_at"))})


# ---------------------------------------------------------------- fee services + records


@router.get("/fee-services", response_model=list[ServiceConfig])
async def all_fee_services(user: dict = Depends(admin)):
    docs = await db.service_configs.find({}).sort("created_at", -1).to_list(100)
    return [ServiceConfig(**{**clean(d), "created_at": as_utc(d.get("created_at")), "updated_at": as_utc(d.get("updated_at"))}) for d in docs]


@router.post("/fee-services", response_model=ServiceConfig)
async def create_fee_service(payload: ServiceConfigCreate, user: dict = Depends(admin)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "version": 1, "created_by": user["id"], "created_at": _now(), "updated_at": _now()})
    await db.service_configs.insert_one(doc)
    await audit(user, "fee.service_create", "service_config", doc["id"], f"name={payload.service_name}")
    return ServiceConfig(**doc)


@router.put("/fee-services/{service_id}", response_model=ServiceConfig)
async def update_fee_service(service_id: str, payload: ServiceConfigUpdate, user: dict = Depends(admin)):
    doc = await db.service_configs.find_one({"id": service_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Service not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    terms_fields = {"description", "fee_amount", "currency", "tax_details", "who_pays", "trigger_conditions", "refund_cancellation_terms", "due_terms"}
    if terms_fields & set(updates.keys()):
        updates["version"] = doc.get("version", 1) + 1  # material terms change => new version
    updates["updated_at"] = _now()
    await db.service_configs.update_one({"id": service_id}, {"$set": updates})
    await audit(user, "fee.service_update", "service_config", service_id, f"fields={list(updates.keys())}")
    updated = await db.service_configs.find_one({"id": service_id})
    return ServiceConfig(**{**clean(updated), "created_at": as_utc(updated.get("created_at")), "updated_at": as_utc(updated.get("updated_at"))})


@router.get("/fee-records")
async def all_fee_records(status: str | None = None, user: dict = Depends(admin)) -> dict[str, Any]:
    query = {"status": status} if status else {}
    docs = await db.fee_records.find(query).sort("created_at", -1).to_list(500)
    docs = [{**clean(d), "created_at": as_utc(d.get("created_at")), "updated_at": as_utc(d.get("updated_at")), "payment_confirmed_at": as_utc(d.get("payment_confirmed_at"))} for d in docs]
    candidate_ids = list({d["candidate_id"] for d in docs})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": candidate_ids}}).to_list(1000)}
    for d in docs:
        u = users.get(d["candidate_id"], {})
        d["candidate_name"] = u.get("full_name")
        d["candidate_email"] = u.get("email")
    return {"items": docs, "total": len(docs)}


@router.post("/fee-records", response_model=FeeRecord)
async def create_fee_record(payload: FeeRecordCreate, user: dict = Depends(admin)):
    candidate = await db.users.find_one({"id": payload.candidate_id, "role": "candidate"})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    agreement = await db.fee_agreements.find_one({"candidate_id": payload.candidate_id, "service_id": payload.service_id})
    if not agreement:
        raise HTTPException(status_code=400, detail="Candidate has not accepted the terms of this service yet")
    service = await db.service_configs.find_one({"id": payload.service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    seq = await db.fee_records.count_documents({}) + 1
    now = _now()
    record = FeeRecord(
        candidate_id=payload.candidate_id,
        agreement_id=agreement["id"],
        service_name=service["service_name"],
        invoice_number=f"DP-{now.year}{now.month:02d}-{seq:04d}",
        amount=service["fee_amount"],
        currency=service.get("currency", "INR"),
        status="due",
        due_date=payload.due_date,
        admin_notes=payload.admin_notes,
        created_at=now,
        updated_at=now,
    )
    await db.fee_records.insert_one(record.model_dump())
    await notify(
        payload.candidate_id,
        f"Invoice {record.invoice_number} issued",
        f"A fee record for '{service['service_name']}' has been issued. Review the invoice and the terms you accepted in the Service Charges section.",
        "/dashboard/services",
    )
    await audit(user, "fee.record_create", "fee_record", record.id, f"invoice={record.invoice_number}")
    return record


@router.post("/fee-records/{record_id}/payment", response_model=FeeRecord)
async def confirm_payment(record_id: str, payload: PaymentConfirm, user: dict = Depends(admin)):
    doc = await db.fee_records.find_one({"id": record_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if doc.get("status") == "paid":
        raise HTTPException(status_code=400, detail="This invoice is already marked as paid")
    now = _now()
    await db.fee_records.update_one(
        {"id": record_id},
        {
            "$set": {
                "status": "paid",
                "receipt_issued": True,
                "receipt_notes": payload.receipt_notes,
                "provider_reference": payload.provider_reference,
                "payment_confirmed_by": user.get("email"),
                "payment_confirmed_at": now,
                "updated_at": now,
            }
        },
    )
    await notify(
        doc["candidate_id"],
        f"Payment confirmed — receipt for {doc.get('invoice_number')}",
        "Your payment was verified and a receipt was issued. Thank you.",
        "/dashboard/services",
    )
    await audit(user, "fee.payment_confirm", "fee_record", record_id, f"reference={payload.provider_reference}")
    updated = await db.fee_records.find_one({"id": record_id})
    return FeeRecord(**{**clean(updated), "created_at": as_utc(updated.get("created_at")), "updated_at": as_utc(updated.get("updated_at")), "payment_confirmed_at": as_utc(updated.get("payment_confirmed_at"))})


@router.post("/fee-records/{record_id}/dispute", response_model=FeeRecord)
async def resolve_dispute(record_id: str, payload: DisputeUpdate, user: dict = Depends(admin)):
    doc = await db.fee_records.find_one({"id": record_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if payload.status not in ("disputed", "cancelled", "refunded", "due"):
        raise HTTPException(status_code=400, detail="Invalid dispute resolution status")
    now = _now()
    await db.fee_records.update_one(
        {"id": record_id},
        {"$set": {"status": payload.status, "dispute_status": f"admin:{payload.status}", "admin_notes": payload.admin_notes or doc.get("admin_notes"), "updated_at": now}},
    )
    await notify(
        doc["candidate_id"],
        f"Invoice {doc.get('invoice_number')} update",
        f"The status of invoice {doc.get('invoice_number')} is now '{payload.status}'.",
        "/dashboard/services",
    )
    await audit(user, "fee.dispute_resolve", "fee_record", record_id, f"status={payload.status}")
    updated = await db.fee_records.find_one({"id": record_id})
    return FeeRecord(**{**clean(updated), "created_at": as_utc(updated.get("created_at")), "updated_at": as_utc(updated.get("updated_at")), "payment_confirmed_at": as_utc(updated.get("payment_confirmed_at"))})


# ---------------------------------------------------------------- users / staff


@router.get("/users")
async def list_users(role: str | None = None, q: str | None = None, user: dict = Depends(admin)) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if role:
        query["role"] = role
    if q:
        rx = {"$regex": q.replace("+", "\\+"), "$options": "i"}
        query["$or"] = [{"full_name": rx}, {"email": rx}]
    docs = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    docs = [{**clean(d), "created_at": as_utc(d.get("created_at"))} for d in docs]
    return {"items": docs, "total": len(docs)}


class StaffCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # employee | admin
    designation: str | None = None


@router.post("/users", response_model=UserOut)
async def create_staff(payload: StaffCreate, user: dict = Depends(admin)):
    if payload.role not in ("employee", "admin"):
        raise HTTPException(status_code=400, detail="Role must be employee or admin — candidates register publicly")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "full_name": payload.full_name.strip(),
        "phone": None,
        "active": True,
        "company_name": None,
        "created_at": _now(),
    }
    await db.users.insert_one(doc)
    if payload.role == "employee":
        count = await db.employee_profiles.count_documents({})
        await db.employee_profiles.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "employee_code": f"DP-E-{count + 1:04d}",
                "designation": payload.designation,
                "department": "Recruitment",
                "verification_status": "pending",
                "documents": [],
                "created_at": _now(),
                "updated_at": _now(),
            }
        )
    await audit(user, "user.create_staff", "user", user_id, f"role={payload.role}")
    return UserOut(**doc)


@router.put("/users/{user_id}/status", response_model=UserOut)
async def set_user_status(user_id: str, payload: dict, user: dict = Depends(admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    active = payload.get("active")
    if active is None:
        raise HTTPException(status_code=400, detail="'active' is required")
    if user_id == user["id"] and not active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    await db.users.update_one({"id": user_id}, {"$set": {"active": bool(active)}})
    if not active:
        await db.sessions.delete_many({"user_id": user_id})
    await audit(user, "user.status_change", "user", user_id, f"active={active}")
    updated = await db.users.find_one({"id": user_id}, {"password_hash": 0})
    return UserOut(**{**clean(updated), "created_at": as_utc(updated.get("created_at"))})


@router.get("/employees")
async def list_employees(status: str | None = None, user: dict = Depends(admin)) -> dict[str, Any]:
    """Every employee account with its onboarding profile — the admin approval queue."""
    users = await db.users.find({"role": "employee"}, {"password_hash": 0}).sort("created_at", -1).to_list(500)
    profiles = {p["user_id"]: p for p in await db.employee_profiles.find({}).to_list(1000)}
    items: list[dict[str, Any]] = []
    for u in users:
        p = profiles.get(u["id"], {})
        if status and (p.get("verification_status") or "pending") != status:
            continue
        items.append(
            {
                "user": {**clean(u), "created_at": as_utc(u.get("created_at"))},
                "profile": {
                    **clean(p),
                    "created_at": as_utc(p.get("created_at")),
                    "updated_at": as_utc(p.get("updated_at")),
                    "submitted_at": as_utc(p.get("submitted_at")) if p.get("submitted_at") else None,
                }
                if p
                else None,
            }
        )
    return {"items": items, "total": len(items)}


@router.put("/employees/{user_id}/verification")
async def verify_employee(user_id: str, payload: dict, user: dict = Depends(admin)):
    status = payload.get("status")
    if status not in ("pending", "submitted", "approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid verification status")
    profile = await db.employee_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    updates: dict[str, Any] = {"verification_status": status, "updated_at": _now()}
    if payload.get("review_note") is not None:
        updates["review_note"] = payload.get("review_note")
    if payload.get("designation"):
        updates["designation"] = payload.get("designation")
    if payload.get("department"):
        updates["department"] = payload.get("department")
    if isinstance(payload.get("working_days"), list):
        updates["working_days"] = [d for d in payload["working_days"] if d in WORKING_DAYS]
    if status == "approved":
        updates["onboarding_step"] = 4
        if not updates.get("working_days") and not profile.get("working_days"):
            updates["working_days"] = ["mon", "tue", "wed", "thu", "fri"]
    if status == "rejected":
        updates["onboarding_step"] = 1
    await db.employee_profiles.update_one({"user_id": user_id}, {"$set": updates})
    labels = {
        "approved": "approved — your portal, employee ID card and daily attendance are now available",
        "rejected": "returned for correction — please update your details and re-upload valid documents",
        "pending": "set back to pending",
        "submitted": "marked as submitted for review",
    }
    await notify(user_id, "Onboarding review update", f"Your onboarding was {labels.get(status)}.", "/employee")
    await audit(user, "employee.verify", "employee_profile", profile["id"], f"status={status}")
    return {"ok": True}


# ---------------------------------------------------------------- assignments


@router.get("/assignments")
async def list_assignments(employee_id: str | None = None, user: dict = Depends(admin)) -> dict[str, Any]:
    query = {"employee_id": employee_id} if employee_id else {}
    docs = await db.assignments.find(query).sort("created_at", -1).to_list(500)
    docs = [{**clean(d), "created_at": as_utc(d.get("created_at"))} for d in docs]
    staff_ids = list({d["employee_id"] for d in docs})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": staff_ids}}, {"password_hash": 0}).to_list(100)}
    for d in docs:
        d["employee_name"] = users.get(d["employee_id"], {}).get("full_name")
    return {"items": docs, "total": len(docs)}


@router.post("/assignments")
async def create_assignment(payload: dict, user: dict = Depends(admin)):
    employee_id = payload.get("employee_id", "")
    assignment_type = payload.get("assignment_type", "")
    target_id = payload.get("target_id", "")
    if assignment_type not in ("job", "application", "offer", "candidate"):
        raise HTTPException(status_code=400, detail="Invalid assignment type")
    employee = await db.users.find_one({"id": employee_id, "role": "employee"})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    collections = {"job": "jobs", "application": "applications", "offer": "offer_submissions", "candidate": "users"}
    target = await db[collections[assignment_type]].find_one({"id": target_id})
    if not target:
        raise HTTPException(status_code=404, detail=f"{assignment_type} record not found")
    existing = await db.assignments.find_one({"employee_id": employee_id, "assignment_type": assignment_type, "target_id": target_id, "active": True})
    if existing:
        return {**clean(existing), "created_at": as_utc(existing.get("created_at"))}
    doc = {"id": str(uuid.uuid4()), "employee_id": employee_id, "assignment_type": assignment_type, "target_id": target_id, "assigned_by": user["id"], "active": True, "created_at": _now()}
    await db.assignments.insert_one(doc)
    await audit(user, "assignment.create", assignment_type, target_id, f"employee={employee_id}")
    return {**clean(doc), "created_at": doc["created_at"].isoformat()}


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, user: dict = Depends(admin)):
    result = await db.assignments.delete_one({"id": assignment_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await audit(user, "assignment.delete", "assignment", assignment_id)
    return {"ok": True}


# ---------------------------------------------------------------- content / enquiries / audit


@router.get("/content")
async def all_content(user: dict = Depends(admin)) -> list:
    docs = await db.site_content.find({}).sort("key", 1).to_list(200)
    return [{**clean(d), "updated_at": as_utc(d.get("updated_at"))} for d in docs]


@router.put("/content/{key}")
async def set_content(key: str, payload: dict, user: dict = Depends(admin)):
    value = payload.get("value")
    if value is None:
        raise HTTPException(status_code=400, detail="'value' is required")
    await db.site_content.update_one(
        {"key": key},
        {"$set": {"value": value, "updated_by": user.get("email"), "updated_at": _now()}},
        upsert=True,
    )
    await audit(user, "content.update", "site_content", key)
    return {"ok": True}


@router.get("/enquiries")
async def list_enquiries(status: str | None = None, user: dict = Depends(admin)) -> dict[str, Any]:
    query = {"status": status} if status else {}
    docs = await db.contact_enquiries.find(query).sort("created_at", -1).to_list(500)
    docs = [{**clean(d), "created_at": as_utc(d.get("created_at"))} for d in docs]
    return {"items": docs, "total": len(docs)}


@router.put("/enquiries/{enquiry_id}")
async def update_enquiry(enquiry_id: str, payload: dict, user: dict = Depends(admin)):
    status = payload.get("status")
    if status not in ("new", "in_progress", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid enquiry status")
    result = await db.contact_enquiries.update_one({"id": enquiry_id}, {"$set": {"status": status}})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    await audit(user, "enquiry.status_change", "contact_enquiry", enquiry_id, f"status={status}")
    return {"ok": True}


@router.get("/audit-logs")
async def audit_logs(limit: int = 100, user: dict = Depends(admin)) -> list:
    docs = await db.audit_logs.find({}).sort("created_at", -1).limit(min(limit, 300)).to_list(300)
    return [{**clean(d), "created_at": as_utc(d.get("created_at"))} for d in docs]
