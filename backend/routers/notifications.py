"""In-app notifications for the logged-in user."""

from typing import Any

from fastapi import APIRouter, Depends

from lib.auth import get_current_user
from lib.db import db
from lib.storage import as_utc, clean

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(limit: int = 50, user: dict = Depends(get_current_user)) -> dict[str, Any]:
    docs = (
        await db.notifications.find({"user_id": user["id"]})
        .sort("created_at", -1)
        .limit(min(limit, 100))
        .to_list(100)
    )
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    items = [{**clean(d), "created_at": as_utc(d.get("created_at"))} for d in docs]
    return {"items": items, "unread": unread}


@router.post("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}
