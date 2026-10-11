"""Authentication: httpOnly-cookie sessions for candidates, employers, employees, admins.
Public registration can only create candidate or employer accounts — never staff."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import (
    COOKIE_NAME,
    audit,
    notify,
    create_session,
    destroy_session,
    get_current_user,
    session_cookie,
)
from lib.db import db
from lib.security import hash_password, verify_password
from models.users import (
    CANDIDATE_CATEGORIES,
    CandidateProfile,
    EmployeeProfile,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def user_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["id"],
        email=doc["email"],
        role=doc["role"],
        full_name=doc.get("full_name", ""),
        phone=doc.get("phone"),
        active=doc.get("active", True),
        company_name=doc.get("company_name"),
        created_at=doc.get("created_at") or _now(),
    )


async def me_payload(user_id: str) -> MeResponse:
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")
    candidate_profile = await db.candidate_profiles.find_one({"user_id": user_id})
    employee_profile = await db.employee_profiles.find_one({"user_id": user_id})
    return MeResponse(
        user=user_out(user),
        candidate_profile=CandidateProfile(**candidate_profile) if candidate_profile else None,
        employee_profile=EmployeeProfile(**employee_profile) if employee_profile else None,
    )


@router.post("/register", response_model=MeResponse)
async def register(payload: RegisterRequest, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    role = "employee"
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": role,
        "full_name": payload.full_name.strip(),
        "phone": payload.phone,
        "active": True,
        "company_name": None,
        "created_at": _now(),
    }
    await db.users.insert_one(user)

    count = await db.employee_profiles.count_documents({})
    profile = EmployeeProfile(
        user_id=user_id,
        employee_code=f"DP-E-{count + 1:04d}",
        department="Recruitment",
        verification_status="pending",
        onboarding_step=1,
    )
    await db.employee_profiles.insert_one(profile.model_dump())
    for admin_user in await db.users.find({"role": "admin"}).to_list(50):
        await notify(
            admin_user["id"],
            "New employee registration",
            f"{user['full_name']} ({email}) registered and must complete onboarding before approval.",
            "/admin/employees",
        )

    token = await create_session(user_id)
    response.set_cookie(**session_cookie(token))
    await audit({"id": user_id, "email": email, "role": role}, "auth.register", "user", user_id, f"role={role}")
    return await me_payload(user_id)


@router.post("/login", response_model=MeResponse)
async def login(payload: LoginRequest, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    token = await create_session(user["id"])
    response.set_cookie(**session_cookie(token))
    await audit(user, "auth.login", "user", user["id"])
    return await me_payload(user["id"])


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await destroy_session(token)
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
async def me(user: dict = Depends(get_current_user)):
    return await me_payload(user["id"])
