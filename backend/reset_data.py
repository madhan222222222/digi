"""Purge all smoke-test / demo business data, keeping only the staff accounts.

Run:  cd /app/backend && python reset_data.py
Keeps: admin + employee accounts (and their employee profile). Clears everything else.
"""

import asyncio

from lib.db import client, db, ensure_indexes

KEEP_EMAILS = {"admin@digiphonicstechnology.com", "employee@digiphonicstechnology.com"}

COLLECTIONS = [
    "jobs",
    "applications",
    "interviews",
    "saved_jobs",
    "questions",
    "question_bookmarks",
    "offer_submissions",
    "service_configs",
    "fee_agreements",
    "fee_records",
    "notifications",
    "contact_enquiries",
    "assignments",
    "audit_logs",
    "candidate_profiles",
    "employer_profiles",
    "files",
    "download_tokens",
    "status_checks",
]


async def main() -> None:
    keep = await db.users.find({"email": {"$in": list(KEEP_EMAILS)}}).to_list(10)
    keep_ids = [u["id"] for u in keep]

    for name in COLLECTIONS:
        result = await db[name].delete_many({})
        if result.deleted_count:
            print(f"  cleared {name}: {result.deleted_count}")

    removed = await db.users.delete_many({"email": {"$nin": list(KEEP_EMAILS)}})
    print(f"  removed non-staff users: {removed.deleted_count}")
    await db.sessions.delete_many({"user_id": {"$nin": keep_ids}})

    # The employee profile was cleared with candidate/employer profiles? No — restore it.
    for user in keep:
        if user["role"] == "employee" and not await db.employee_profiles.find_one({"user_id": user["id"]}):
            import uuid
            from datetime import datetime, timezone

            await db.employee_profiles.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user["id"],
                    "employee_code": "DP-E-0001",
                    "designation": "Talent Acquisition Specialist",
                    "department": "Recruitment",
                    "verification_status": "approved",
                    "documents": [],
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            )
            print("  restored employee profile")

    await ensure_indexes()
    print("Done — database holds staff accounts only.")


if __name__ == "__main__":
    asyncio.run(main())
    client.close()
