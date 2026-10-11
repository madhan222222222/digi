"""Session auth (httpOnly cookie), role dependencies, audit log + notification helpers.

Sessions are random DB-backed tokens; the cookie carries no user data. Every protected
router depends on `get_current_user` / `require_roles(...)`.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, Request

from lib.db import db

COOKIE_NAME = "dp_session"
SESSION_DAYS = 30


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one(
        {
            "token": token,
            "user_id": user_id,
            "created_at": _now(),
            "expires_at": _now() + timedelta(days=SESSION_DAYS),
        }
    )
    return token


async def destroy_session(token: str) -> None:
    await db.sessions.delete_one({"token": token})


def session_cookie(token: str) -> dict[str, Any]:
    return {
        "key": COOKIE_NAME,
        "value": token,
        "httponly": True,
        "samesite": "lax",
        "path": "/",
        "max_age": SESSION_DAYS * 24 * 3600,
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    expires_at = session.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < _now():
            raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"id": session["user_id"]})
    if not user or not user.get("active", True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    return user


async def get_optional_user(request: Request) -> dict | None:
    """Like get_current_user but returns None instead of raising — for public endpoints
    that personalise their response for logged-in users."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def require_roles(*roles: str):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
        return user

    return checker


def is_staff(user: dict | None) -> bool:
    return bool(user) and user.get("role") in ("admin", "employee")


async def audit(
    actor: dict | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    details: str | None = None,
) -> None:
    await db.audit_logs.insert_one(
        {
            "id": str(uuid.uuid4()),
            "actor_id": (actor or {}).get("id"),
            "actor_email": (actor or {}).get("email"),
            "actor_role": (actor or {}).get("role"),
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details,
            "created_at": _now(),
        }
    )


async def notify(user_id: str, title: str, body: str | None = None, link: str | None = None) -> None:
    await db.notifications.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "body": body,
            "link": link,
            "read": False,
            "created_at": _now(),
        }
    )


async def notify_admins(title: str, body: str | None = None, link: str | None = None) -> None:
    admins = await db.users.find({"role": "admin", "active": True}).to_list(100)
    for admin in admins:
        await notify(admin["id"], title, body, link)
