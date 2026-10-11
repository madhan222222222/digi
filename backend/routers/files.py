"""Private file storage endpoints. Downloads ride short-lived tokens — never public URLs."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse

from lib.auth import audit, get_current_user
from lib.db import db
from lib.storage import UPLOAD_DIR, create_download_token, file_access_allowed, save_upload
from models.misc import FileMeta

router = APIRouter(prefix="/files", tags=["files"])


def _meta_out(meta: dict) -> FileMeta:
    return FileMeta(
        id=meta["id"],
        original_name=meta.get("original_name"),
        content_type=meta.get("content_type"),
        size=meta["size"],
        uploader_id=meta["uploader_id"],
        category=meta["category"],
        created_at=meta.get("created_at"),
    )


@router.post("", response_model=FileMeta)
async def upload(file: UploadFile, category: str = "document", user: dict = Depends(get_current_user)):
    if category not in ("resume", "offer_letter", "document", "supporting"):
        raise HTTPException(status_code=400, detail="Invalid upload category")
    meta = await save_upload(file, category, user["id"])
    await audit(user, "file.upload", "file", meta["id"], f"category={category}")
    return _meta_out(meta)


@router.post("/{file_id}/download-link")
async def download_link(file_id: str, user: dict = Depends(get_current_user)):
    meta = await db.files.find_one({"id": file_id})
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")
    if not await file_access_allowed(user, meta):
        raise HTTPException(status_code=403, detail="Not authorized to access this file")
    token = await create_download_token(file_id, user["id"])
    await audit(user, "file.download_link", "file", file_id)
    return {"url": f"/api/files/download/{token['token']}", "expires_at": token["expires_at"]}


@router.get("/download/{token}")
async def download(token: str):
    rec = await db.download_tokens.find_one({"token": token})
    if not rec:
        raise HTTPException(status_code=404, detail="Download link expired or invalid")
    meta = await db.files.find_one({"id": rec["file_id"]})
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")
    path = UPLOAD_DIR / meta["stored_name"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="File data missing")
    return FileResponse(
        path,
        media_type=meta.get("content_type") or "application/octet-stream",
        filename=meta.get("original_name") or "document",
    )


@router.get("/{file_id}", response_model=FileMeta)
async def file_meta(file_id: str, user: dict = Depends(get_current_user)):
    meta = await db.files.find_one({"id": file_id})
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")
    if not await file_access_allowed(user, meta):
        raise HTTPException(status_code=403, detail="Not authorized to access this file")
    return _meta_out(meta)
