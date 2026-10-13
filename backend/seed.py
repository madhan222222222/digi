
"""Run once to create or update the initial DigiHire staff accounts.

Run from the backend directory:
    python seed.py

Set the credentials as environment variables before running.
Do not run this script automatically every time the server starts.
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone

from lib.db import client, db, ensure_indexes
from lib.security import hash_password


ADMIN_EMAIL = os.environ["ADMIN_EMAIL"].strip().lower()
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

EMPLOYEE_EMAIL = os.environ["EMPLOYEE_EMAIL"].strip().lower()
EMPLOYEE_PASSWORD = os.environ["EMPLOYEE_PASSWORD"]


def _now():
    return datetime.now(timezone.utc)


async def create_account(
    email: str,
    password: str,
    role: str,
    full_name: str,
    designation: str | None = None,
):
    existing = await db.users.find_one({"email": email})

    if existing:
        await db.users.update_one(
            {"id": existing["id"]},
            {
                "$set": {
                    "password_hash": hash_password(password),
                    "role": role,
                    "active": True,
                }
            },
        )
        print(f"Updated account: {email} ({role})")
        return

    user_id = str(uuid.uuid4())

    await db.users.insert_one(
        {
            "id": user_id,
            "email": email,
            "password_hash": hash_password(password),
            "role": role,
            "full_name": full_name,
            "phone": None,
            "active": True,
            "company_name": None,
            "created_at": _now(),
        }
    )

    if role == "employee":
        count = await db.employee_profiles.count_documents({})

        await db.employee_profiles.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "employee_code": f"DP-E-{count + 1:04d}",
                "designation": designation,
                "department": "Recruitment",
                "verification_status": "approved",
                "documents": [],
                "created_at": _now(),
                "updated_at": _now(),
            }
        )

    print(f"Created account: {email} ({role})")


async def main():
    try:
        print("Checking database indexes...")
        await ensure_indexes()

        print("Creating/updating initial accounts...")
        await create_account(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
            "admin",
            "DigiHire Admin",
        )
        await create_account(
            EMPLOYEE_EMAIL,
            EMPLOYEE_PASSWORD,
            "employee",
            "DigiHire Staff",
            "Talent Acquisition Specialist",
        )

        print("Finished successfully.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
