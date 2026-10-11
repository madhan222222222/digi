"""Public interview-question library + candidate bookmarks + practice sets."""

import math
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from lib.auth import get_optional_user, require_roles
from lib.db import db
from lib.storage import as_utc, clean
from models.questions import Question

router = APIRouter(prefix="/questions", tags=["questions"])


def q_out(doc: dict) -> Question:
    doc = clean(doc)
    doc["created_at"] = as_utc(doc.get("created_at"))
    doc["updated_at"] = as_utc(doc.get("updated_at"))
    return Question(**doc)


def _contains(text: str) -> dict:
    import re

    return {"$regex": re.escape(text), "$options": "i"}


@router.get("")
async def list_questions(
    request: Request,
    q: str | None = None,
    category: str | None = None,
    difficulty: str | None = None,
    question_type: str | None = None,
    tag: str | None = None,
    page: int = 1,
    limit: int = 12,
) -> dict[str, Any]:
    user = await get_optional_user(request)
    query: dict[str, Any] = {}
    if not (user and user.get("role") == "admin"):
        query["published"] = True
    if q:
        query["$or"] = [{"question": _contains(q)}, {"topic": _contains(q)}, {"tags": _contains(q)}]
    if category:
        query["category"] = category
    if difficulty:
        query["difficulty"] = difficulty
    if question_type:
        query["question_type"] = question_type
    if tag:
        query["tags"] = _contains(tag)

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
    return {
        "items": [q_out(d).model_dump(mode="json") for d in docs],
        "total": total,
        "page": page,
        "pages": pages,
    }


@router.get("/categories")
async def categories():
    rows = await db.questions.aggregate(
        [
            {"$match": {"published": True}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
    ).to_list(200)
    return [{"category": r["_id"], "count": r["count"]} for r in rows]


@router.get("/practice", response_model=list[Question])
async def practice(
    request: Request,
    category: str | None = None,
    difficulty: str | None = None,
    count: int = 5,
):
    query: dict[str, Any] = {"published": True}
    if category:
        query["category"] = category
    if difficulty:
        query["difficulty"] = difficulty
    count = min(max(count, 1), 10)
    docs = await db.questions.aggregate([{"$match": query}, {"$sample": {"size": count}}]).to_list(count)
    return [q_out(d) for d in docs]


@router.get("/bookmarks", response_model=list[Question])
async def bookmarks(user: dict = Depends(require_roles("candidate"))):
    marks = await db.question_bookmarks.find({"candidate_id": user["id"]}).to_list(1000)
    ids = [m["question_id"] for m in marks]
    docs = await db.questions.find({"id": {"$in": ids}}).to_list(1000)
    return [q_out(d) for d in docs]


@router.post("/{question_id}/bookmark")
async def add_bookmark(question_id: str, user: dict = Depends(require_roles("candidate"))):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.question_bookmarks.update_one(
        {"candidate_id": user["id"], "question_id": question_id},
        {"$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True}


@router.delete("/{question_id}/bookmark")
async def remove_bookmark(question_id: str, user: dict = Depends(require_roles("candidate"))):
    await db.question_bookmarks.delete_one({"candidate_id": user["id"], "question_id": question_id})
    return {"ok": True}


@router.get("/{question_id}", response_model=Question)
async def get_question(question_id: str, request: Request):
    doc = await db.questions.find_one({"id": question_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")
    user = await get_optional_user(request)
    if not doc.get("published", False) and not (user and user.get("role") == "admin"):
        raise HTTPException(status_code=404, detail="Question not found")
    return q_out(doc)
