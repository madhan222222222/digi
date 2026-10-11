"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("email", ASCENDING)], name="email", unique=True),
        IndexModel([("role", ASCENDING), ("active", ASCENDING)], name="role_active"),
    ],
    "sessions": [
        IndexModel([("token", ASCENDING)], name="token", unique=True),
        IndexModel([("expires_at", ASCENDING)], name="expires_at", expireAfterSeconds=0),
    ],
    "candidate_profiles": [
        IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
        IndexModel([("category", ASCENDING)], name="category"),
    ],
    "employer_profiles": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "employee_profiles": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "jobs": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("posted_at", DESCENDING)], name="status_posted"),
        IndexModel([("employer_id", ASCENDING)], name="employer_id"),
        IndexModel([("candidate_categories", ASCENDING)], name="categories"),
    ],
    "applications": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("candidate_id", ASCENDING), ("created_at", DESCENDING)], name="candidate_created"),
        IndexModel([("job_id", ASCENDING)], name="job_id"),
        IndexModel([("status", ASCENDING)], name="status"),
    ],
    "interviews": [
        IndexModel([("application_id", ASCENDING)], name="application_id"),
        IndexModel([("scheduled_at", ASCENDING)], name="scheduled_at"),
    ],
    "saved_jobs": [
        IndexModel(
            [("candidate_id", ASCENDING), ("job_id", ASCENDING)],
            name="candidate_job",
            unique=True,
        )
    ],
    "questions": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("category", ASCENDING), ("published", ASCENDING)], name="category_published"),
        IndexModel([("published", ASCENDING), ("created_at", DESCENDING)], name="published_created"),
    ],
    "question_bookmarks": [
        IndexModel(
            [("candidate_id", ASCENDING), ("question_id", ASCENDING)],
            name="candidate_question",
            unique=True,
        )
    ],
    "offer_submissions": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("candidate_id", ASCENDING)], name="candidate_id"),
        IndexModel([("status", ASCENDING)], name="status"),
    ],
    "service_configs": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "fee_agreements": [
        IndexModel(
            [("candidate_id", ASCENDING), ("service_id", ASCENDING)],
            name="candidate_service",
            unique=True,
        )
    ],
    "fee_records": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("candidate_id", ASCENDING)], name="candidate_id"),
        IndexModel([("status", ASCENDING)], name="status"),
        IndexModel([("invoice_number", ASCENDING)], name="invoice_number", unique=True),
    ],
    "notifications": [
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created")
    ],
    "contact_enquiries": [
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created")
    ],
    "assignments": [
        IndexModel([("employee_id", ASCENDING)], name="employee_id"),
        IndexModel([("assignment_type", ASCENDING), ("target_id", ASCENDING)], name="type_target"),
    ],
    "audit_logs": [IndexModel([("created_at", DESCENDING)], name="created_desc")],
    "site_content": [IndexModel([("key", ASCENDING)], name="key", unique=True)],
    "files": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("uploader_id", ASCENDING)], name="uploader_id"),
    ],
    "download_tokens": [
        IndexModel([("token", ASCENDING)], name="token", unique=True),
        IndexModel([("expires_at", ASCENDING)], name="expires_at", expireAfterSeconds=0),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
