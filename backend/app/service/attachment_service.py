from dataclasses import dataclass
from pathlib import PurePath
from uuid import uuid4

import boto3
from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session

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


async def parse_attachments(files: list[UploadFile]) -> list[PendingAttachment]:
    if len(files) > MAX_ATTACHMENT_COUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"At most {MAX_ATTACHMENT_COUNT} attachment files are allowed.",
        )

    attachments: list[PendingAttachment] = []
    for upload in files:
        content_type = upload.content_type
        if content_type not in ALLOWED_ATTACHMENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only SVG, JPG, PNG, and PDF are allowed.",
            )

        content = await upload.read()
        if len(content) > MAX_ATTACHMENT_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each attachment must be 10MB or smaller.",
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
