from dataclasses import dataclass
from pathlib import PurePath
from uuid import uuid4

import boto3
from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session
try:
    import defusedxml.ElementTree as ET
except ImportError:  # pragma: no cover - fallback for environments without defusedxml installed
    import xml.etree.ElementTree as ET

from app.core.config import settings
from app.model.expense import Attachment


MAX_ATTACHMENT_COUNT = 3
MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "application/pdf",
}


@dataclass(frozen=True)
class PendingAttachment:
    filename: str
    content_type: str | None
    content: bytes

    @property
    def size(self) -> int:
        return len(self.content)


def _is_safe_svg(content: bytes) -> bool:
    """
    Parses the SVG to ensure it is well-formed and rejects payloads with scripts,
    inline event handlers, or javascript: URIs.
    """
    if b"<svg" not in content[:1024].lower():
        return False

    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return False

    if not root.tag.lower().endswith("svg"):
        return False

    for elem in root.iter():
        if elem.tag.lower().endswith("script"):
            return False

        for attr_name, attr_value in elem.attrib.items():
            if attr_name.lower().startswith("on"):
                return False
            if "javascript:" in attr_value.lower():
                return False

    return True


def _verify_file_signature(content: bytes) -> str | None:
    """
    Checks the file's magic bytes to determine its actual format.
    """
    if content.startswith(b"%PDF-"):
        return "application/pdf"

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    if _is_safe_svg(content):
        return "image/svg+xml"

    return None


async def parse_attachments(files: list[UploadFile]) -> list[PendingAttachment]:
    if len(files) > MAX_ATTACHMENT_COUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"At most {MAX_ATTACHMENT_COUNT} attachment files are allowed.",
        )

    attachments: list[PendingAttachment] = []
    for upload in files:
        content = await upload.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{upload.filename}' is empty. 0-byte files are not allowed.",
            )

        if len(content) > MAX_ATTACHMENT_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each attachment must be 10MB or smaller.",
            )

        content_type = _verify_file_signature(content)
        if not content_type or content_type not in ALLOWED_ATTACHMENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid file content in '{upload.filename}'. "
                    "The file does not match an allowed format (SVG, JPG, PNG, PDF)."
                ),
            )

        filename = PurePath(upload.filename or "attachment").name
        attachments.append(
            PendingAttachment(filename=filename, content_type=content_type, content=content)
        )

    return attachments


def store_attachments(
    session: Session,
    expense_request_id: int,
    attachments: list[PendingAttachment],
) -> list[str]:
    if not attachments:
        return []

    if not (
        settings.aws_access_key_id
        and settings.aws_secret_access_key
        and settings.aws_region
        and settings.s3_bucket
    ):
        return [
            f"Skipped {attachment.filename}: AWS S3 is not configured."
            for attachment in attachments
        ]

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )
    warnings: list[str] = []

    for attachment in attachments:
        s3_key = f"{expense_request_id}/{uuid4()}-{attachment.filename}"
        try:
            s3.put_object(
                Bucket=settings.s3_bucket,
                Key=s3_key,
                Body=attachment.content,
                ContentType=attachment.content_type or "application/octet-stream",
            )
        except Exception as exc:
            warnings.append(f"Skipped {attachment.filename}: {exc}")
            continue

        session.add(
            Attachment(
                expense_request_id=expense_request_id,
                file_name=attachment.filename,
                file_url=f"s3://{settings.s3_bucket}/{s3_key}",
                s3_bucket=settings.s3_bucket,
                s3_key=s3_key,
                content_type=attachment.content_type,
                file_size_bytes=attachment.size,
            )
        )

    session.commit()
    return warnings
