"""Bootstrap script: creates the admin account and one staff employee account.
Run once:  cd /app/backend && python seed.py

Creates NO demo business data (no jobs, questions, or candidates) per the project owner's
request — real data is entered through the portals."""

import asyncio
import uuid
from datetime import datetime, timezone

from lib.db import client, db, ensure_indexes
from lib.security import hash_password

ADMIN_EMAIL = "madhankrithickm@gmail.com"
ADMIN_PASSWORD = "madhan@000000"
EMPLOYEE_EMAIL = "employee@digiphonicstechnology.com"
EMPLOYEE_PASSWORD = "Employee@12345"


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_account(email: str, password: str, role: str, full_name: str, designation: str | None = None) -> None:
    existing = await db.users.find_one({"email": email})
    if existing:
        # Keep the built-in account's password in sync with this file (it is the single source of truth).
        await db.users.update_one(
            {"id": existing["id"]},
            {"$set": {"password_hash": hash_password(password), "role": role, "active": True}},
        )
        print(f"  updated: {email} ({role})")
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
    print(f"  created: {email} ({role})")


async def main() -> None:
    print("Ensuring indexes...")
    await ensure_indexes()
    print("Creating staff accounts (no demo business data)...")
    await create_account(ADMIN_EMAIL, ADMIN_PASSWORD, "admin", "DigiPhonics Admin")
    await create_account(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD, "employee", "Priya Sharma", "Talent Acquisition Specialist")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
    client.close()
