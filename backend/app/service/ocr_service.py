from __future__ import annotations

import io
import re
from datetime import datetime
from decimal import Decimal

from typing import List

from PIL import Image
import numpy as np
import easyocr

# Initialize EasyOCR reader at module load time so the model is loaded once
reader = easyocr.Reader(["en","vi"], gpu=False)


def _first_nonempty(lines: List[str]) -> str | None:
    for l in lines:
        if l and re.search(r"[A-Za-z0-9]", l):
            return l.strip()
    return None


def _parse_date_from_text(texts: List[str]) -> str | None:
    # common date patterns seen on receipts
    date_patterns = [
        (r"\b(\d{4}-\d{2}-\d{2})\b", "%Y-%m-%d"),
        (r"\b(\d{2}/\d{2}/\d{4})\b", "%d/%m/%Y"),
        (r"\b(\d{2}-\d{2}-\d{4})\b", "%d-%m-%Y"),
        (r"\b([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})\b", "%B %d, %Y"),
    ]
    for t in texts:
        for pat, fmt in date_patterns:
            m = re.search(pat, t)
            if m:
                try:
                    dt = datetime.strptime(m.group(1), fmt).date()
                    return dt.isoformat()
                except Exception:
                    continue
    return None


def _parse_amount_from_text(texts: List[str]) -> str | None:
    candidates: List[Decimal] = []
    for t in texts:
        # capture currency-like values e.g. $12.34 or 1,234.56
        for m in re.findall(r"\$?\s*([0-9]{1,3}(?:[,\d]*\d)?\.\d{2})", t):
            try:
                val = Decimal(m.replace(",", "").strip())
                candidates.append(val)
            except Exception:
                continue
        # fallback: plain decimals
        for m in re.findall(r"([0-9]+\.\d{2})", t):
            try:
                val = Decimal(m.replace(",", "").strip())
                candidates.append(val)
            except Exception:
                continue

    if not candidates:
        return None

    # Heuristic: largest captured value is usually the total
    total = max(candidates)
    return f"{total:.2f}"


def _guess_category_id(texts: List[str]) -> int | None:
    blob = " ".join(texts).lower()
    if any(k in blob for k in ["hotel", "flight", "airline", "taxi", "uber", "lyft"]):
        return 1
    if any(k in blob for k in ["meal", "lunch", "dinner", "restaurant", "cafe", "food"]):
        return 3
    if any(k in blob for k in ["accommodation", "bnb", "motel", "stay"]):
        return 2
    if any(k in blob for k in ["office", "stationery", "supplies"]):
        return 4
    if "training" in blob or "course" in blob:
        return 5
    return None


def scan_receipt_for_data(file_bytes: bytes) -> dict:
    """
    Returns best-guess structure:
    {
      "date": "YYYY-MM-DD" | None,
      "total_amount": "123.45" | None,
      "vendor_name": "Acme Corp" | None,
      "category_id": int | None
    }
    """
    try:
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        img_arr = np.array(img)
    except Exception:
        # If converting fails, pass raw bytes to reader (best-effort)
        img_arr = file_bytes

    texts = reader.readtext(img_arr, detail=0)
    texts = [str(t).strip() for t in texts if str(t).strip()]

    vendor = _first_nonempty(texts[:6])
    date_guess = _parse_date_from_text(texts)
    amount_guess = _parse_amount_from_text(texts)
    category_guess = _guess_category_id(texts)

    return {
        "date": date_guess,
        "total_amount": amount_guess,
        "vendor_name": vendor,
        "category_id": category_guess,
    }
