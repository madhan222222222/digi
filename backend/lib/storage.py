"""Private file storage: resumes, offer letters, documents. Access only through
permission-checked, short-lived download tokens — never public URLs."""

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile

from lib.db import db

ROOT = Path(__file__).parent.parent
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(ROOT / "uploads")))
MAX_BYTES = 5 * 1024 * 1024

ALLOWED: dict[str, set[str]] = {
    "resume": {".pdf", ".doc", ".docx"},
    "offer_letter": {".pdf"},
    "document": {".pdf", ".jpg", ".jpeg", ".png"},
    "supporting": {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"},
    # Company logos are the one public category — served without a token so job cards render.
    "logo": {".png", ".jpg", ".jpeg", ".webp"},
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def save_upload(file: UploadFile, category: str, uploader_id: str) -> dict:
    ext = Path(file.filename or "").suffix.lower()
    if category not in ALLOWED:
        raise HTTPException(status_code=400, detail="Invalid upload category")
    if ext not in ALLOWED[category]:
        allowed = ", ".join(sorted(ALLOWED[category]))
        raise HTTPException(status_code=400, detail=f"File type '{ext or 'unknown'}' not allowed. Allowed: {allowed}")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 5 MB limit")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}{ext}"
    (UPLOAD_DIR / stored_name).write_bytes(data)

    meta = {
        "id": file_id,
        "original_name": file.filename,
        "stored_name": stored_name,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(data),
        "uploader_id": uploader_id,
        "category": category,
        "created_at": _now(),
    }
    await db.files.insert_one(meta)
    return meta


async def file_access_allowed(user: dict | None, meta: dict) -> bool:
    """Admins: everything. Owner: own uploads. Employees: files attached to records
    explicitly assigned to them (application resumes, offer letters)."""
    if user and user.get("role") == "admin":
        return True
    if user and meta.get("uploader_id") == user.get("id"):
        return True
    if user and user.get("role") == "employee":
        assigned_apps = await db.assignments.distinct(
            "target_id", {"employee_id": user["id"], "assignment_type": "application", "active": True}
        )
        if assigned_apps and await db.applications.find_one(
            {"id": {"$in": assigned_apps}, "resume_file_id": meta["id"]}
        ):
            return True
        assigned_offers = await db.assignments.distinct(
            "target_id", {"employee_id": user["id"], "assignment_type": "offer", "active": True}
        )
        if assigned_offers and await db.offer_submissions.find_one(
            {"id": {"$in": assigned_offers}, "offer_letter_file_id": meta["id"]}
        ):
            return True
    return False


async def create_download_token(file_id: str, user_id: str, minutes: int = 5) -> dict:
    token = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(minutes=minutes)
    await db.download_tokens.insert_one(
        {"token": token, "file_id": file_id, "user_id": user_id, "expires_at": expires_at}
    )
    return {"token": token, "expires_at": expires_at}


def clean(doc: dict) -> dict:
    """Copy a Mongo doc without `_id`. BSON ObjectId is not JSON-serializable and would
    surface as a 500 the moment a raw doc is returned from a route."""
    return {k: v for k, v in doc.items() if k != "_id"}


def as_utc(dt: datetime | None) -> datetime | None:
    """Normalise motor's naive datetimes to aware UTC so JS `new Date(...)` parses them."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
