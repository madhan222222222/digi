"""Service charges: public terms, candidate consent, invoices.
Payments are DISABLED until a provider + approved terms are configured — confirmation is manual."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import audit, get_current_user, notify, notify_admins, require_roles
from lib.db import db
from lib.storage import as_utc, clean
from models.fees import AcceptTerms, FeeAgreement, FeeRecord

router = APIRouter(prefix="/fees", tags=["fees"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _service_out(doc: dict) -> dict:
    return {**clean(doc), "created_at": as_utc(doc.get("created_at")), "updated_at": as_utc(doc.get("updated_at"))}


def _record_out(doc: dict) -> dict:
    return {
        **clean(doc),
        "created_at": as_utc(doc.get("created_at")),
        "updated_at": as_utc(doc.get("updated_at")),
        "payment_confirmed_at": as_utc(doc.get("payment_confirmed_at")),
    }


@router.get("/services", response_model=list)
async def list_services():
    docs = await db.service_configs.find({"active": True}).sort("created_at", -1).to_list(100)
    return [_service_out(d) for d in docs]


@router.post("/agreements", response_model=FeeAgreement)
async def accept_terms(payload: AcceptTerms, user: dict = Depends(require_roles("candidate"))):
    service = await db.service_configs.find_one({"id": payload.service_id, "active": True})
    if not service:
        raise HTTPException(status_code=404, detail="This service is not currently available")

    existing = await db.fee_agreements.find_one({"candidate_id": user["id"], "service_id": payload.service_id})
    if existing:
        return FeeAgreement(**_record_out(existing))

    agreement = FeeAgreement(
        candidate_id=user["id"],
        service_id=service["id"],
        service_name=service["service_name"],
        terms_version=service.get("version", 1),
    )
    await db.fee_agreements.insert_one(agreement.model_dump())
    await audit(user, "fee.agreement_accept", "service_config", service["id"], f"terms_version={agreement.terms_version}")
    return agreement


@router.get("/agreements/me", response_model=list)
async def my_agreements(user: dict = Depends(require_roles("candidate"))):
    docs = await db.fee_agreements.find({"candidate_id": user["id"]}).sort("accepted_at", -1).to_list(100)
    return [_record_out(d) for d in docs]


@router.get("/invoices", response_model=list)
async def my_invoices(user: dict = Depends(require_roles("candidate"))):
    docs = await db.fee_records.find({"candidate_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [_record_out(d) for d in docs]


@router.post("/invoices/{invoice_id}/dispute", response_model=FeeRecord)
async def dispute_invoice(invoice_id: str, payload: dict, user: dict = Depends(require_roles("candidate"))):
    doc = await db.fee_records.find_one({"id": invoice_id, "candidate_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if doc.get("status") in ("paid", "cancelled", "refunded"):
        raise HTTPException(status_code=400, detail="This invoice can no longer be disputed")

    reason = (payload or {}).get("reason")
    updates = {
        "status": "disputed",
        "dispute_status": "candidate_requested",
        "admin_notes": (doc.get("admin_notes") or "") + (f"\nCandidate dispute: {reason}" if reason else "\nCandidate dispute requested"),
        "updated_at": _now(),
    }
    await db.fee_records.update_one({"id": invoice_id}, {"$set": updates})
    await notify_admins("Fee dispute requested", f"Candidate disputed invoice {doc.get('invoice_number')}.", "/admin/fees")
    await audit(user, "fee.dispute_request", "fee_record", invoice_id)
    updated = await db.fee_records.find_one({"id": invoice_id})
    return FeeRecord(**_record_out(updated))
