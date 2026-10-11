"""Daily attendance. Employees mark their own day (server-anchored date); admins
manage, override and review every record. Attendance is only open to approved employees."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from lib.auth import audit, get_current_user, notify, require_roles
from lib.dates import today_iso
from lib.db import db
from lib.storage import as_utc, clean
from models.users import ATTENDANCE_STATUSES

router = APIRouter(prefix="/attendance", tags=["attendance"])
admin = require_roles("admin")


def _now() -> datetime:
    return datetime.now(timezone.utc)


class MarkRequest(BaseModel):
    status: str = "present"
    note: str | None = None


class AdminMarkRequest(BaseModel):
    employee_id: str
    date: str
    status: str
    note: str | None = None


def row_out(doc: dict) -> dict:
    doc = clean(doc)
    doc["created_at"] = as_utc(doc.get("created_at"))
    return doc


async def _upsert(employee_id: str, date: str, status: str, note: str | None, actor: dict) -> dict:
    if status not in ATTENDANCE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(ATTENDANCE_STATUSES)}")
    existing = await db.attendance.find_one({"employee_id": employee_id, "date": date})
    doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "employee_id": employee_id,
        "date": date,
        "status": status,
        "check_in": datetime.now(timezone.utc).strftime("%H:%M UTC"),
        "note": note,
        "marked_by": actor["id"],
        "marked_by_role": actor.get("role", "employee"),
        "created_at": existing.get("created_at") if existing else _now(),
    }
    await db.attendance.replace_one({"employee_id": employee_id, "date": date}, doc, upsert=True)
    return doc


# ---------------------------------------------------------------- employee


@router.post("/me")
async def mark_today(payload: MarkRequest, user: dict = Depends(get_current_user)):
    if user.get("role") != "employee":
        raise HTTPException(status_code=403, detail="Only employees mark their own attendance")
    profile = await db.employee_profiles.find_one({"user_id": user["id"]})
    if not profile or profile.get("verification_status") != "approved":
        raise HTTPException(status_code=403, detail="Attendance opens once an admin approves your onboarding")
    date = today_iso()
    if await db.attendance.find_one({"employee_id": user["id"], "date": date}):
        raise HTTPException(status_code=400, detail="Attendance for today is already recorded")
    doc = await _upsert(user["id"], date, payload.status, payload.note, user)
    await audit(user, "attendance.mark", "attendance", doc["id"], f"date={date} status={payload.status}")
    return row_out(doc)


@router.get("/me")
async def my_attendance(user: dict = Depends(get_current_user)) -> dict[str, Any]:
    if user.get("role") != "employee":
        raise HTTPException(status_code=403, detail="Employees only")
    rows = await db.attendance.find({"employee_id": user["id"]}).sort("date", -1).to_list(200)
    rows = [row_out(r) for r in rows]
    present = sum(1 for r in rows if r["status"] in ("present", "half_day"))
    return {"items": rows, "total": len(rows), "today": today_iso(), "present_days": present}


# ---------------------------------------------------------------- admin


@router.get("/admin")
async def all_attendance(
    date: str | None = None, employee_id: str | None = None, user: dict = Depends(admin)
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if date:
        query["date"] = date
    if employee_id:
        query["employee_id"] = employee_id
    rows = await db.attendance.find(query).sort("date", -1).to_list(500)
    rows = [row_out(r) for r in rows]
    ids = list({r["employee_id"] for r in rows})
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": ids}}).to_list(500)}
    for r in rows:
        u = users.get(r["employee_id"], {})
        r["employee_name"] = u.get("full_name")
        r["employee_email"] = u.get("email")
    return {"items": rows, "total": len(rows), "today": today_iso()}


@router.get("/admin/report")
async def monthly_report(month: str | None = None, user: dict = Depends(admin)) -> dict[str, Any]:
    """Per-employee present / half-day / leave / absent / week-off totals for one month (YYYY-MM)."""
    month = month or today_iso()[:7]
    if len(month) != 7 or month[4] != "-":
        raise HTTPException(status_code=400, detail="month must be in YYYY-MM format")
    rows = await db.attendance.find({"date": {"$regex": f"^{month}"}}).to_list(5000)
    staff = await db.users.find({"role": "employee"}, {"password_hash": 0}).to_list(500)
    profiles = {p["user_id"]: p for p in await db.employee_profiles.find({}).to_list(1000)}

    by_employee: dict[str, dict[str, Any]] = {}
    for u in staff:
        p = profiles.get(u["id"], {})
        if (p.get("verification_status") or "pending") != "approved":
            continue
        by_employee[u["id"]] = {
            "employee_id": u["id"],
            "employee_name": u.get("full_name"),
            "employee_email": u.get("email"),
            "employee_code": p.get("employee_code"),
            "designation": p.get("designation"),
            "working_days": p.get("working_days") or [],
            "present": 0,
            "half_day": 0,
            "leave": 0,
            "absent": 0,
            "week_off": 0,
            "marked_days": 0,
        }
    for r in rows:
        row = by_employee.get(r["employee_id"])
        if not row:
            continue
        status = r.get("status", "present")
        if status in row:
            row[status] += 1
        row["marked_days"] += 1
    items = sorted(by_employee.values(), key=lambda r: (r["employee_name"] or "").lower())
    for r in items:
        # Payable days: a full present day counts 1, a half day counts 0.5.
        r["payable_days"] = r["present"] + 0.5 * r["half_day"]
    totals = {
        k: sum(r[k] for r in items)
        for k in ("present", "half_day", "leave", "absent", "week_off", "marked_days", "payable_days")
    }
    return {"month": month, "items": items, "total": len(items), "totals": totals}


@router.post("/admin")
async def admin_mark(payload: AdminMarkRequest, user: dict = Depends(admin)):
    target = await db.users.find_one({"id": payload.employee_id, "role": "employee"})
    if not target:
        raise HTTPException(status_code=404, detail="Employee not found")
    doc = await _upsert(payload.employee_id, payload.date, payload.status, payload.note, user)
    await notify(
        payload.employee_id,
        "Attendance updated by admin",
        f"Your attendance for {payload.date} was set to {payload.status}.",
        "/employee/attendance",
    )
    await audit(user, "attendance.admin_mark", "attendance", doc["id"], f"date={payload.date} status={payload.status}")
    return row_out(doc)


@router.delete("/admin/{record_id}")
async def admin_delete(record_id: str, user: dict = Depends(admin)):
    result = await db.attendance.delete_one({"id": record_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    await audit(user, "attendance.delete", "attendance", record_id)
    return {"ok": True}
