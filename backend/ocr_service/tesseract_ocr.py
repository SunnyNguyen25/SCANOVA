"""Fast, lightweight OCR endpoint for English certificates using Tesseract."""

from io import BytesIO
import subprocess

from fastapi import APIRouter, File, HTTPException, UploadFile
import fitz
from PIL import Image

router = APIRouter()

SUPPORTED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}


def _load_images(content: bytes, content_type: str) -> list[Image.Image]:
    if content_type == "application/pdf":
        document = fitz.open(stream=content, filetype="pdf")
        return [
            Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            for page in document
            for pix in [page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)]
        ]
    return [Image.open(BytesIO(content)).convert("RGB")]


def read_tesseract_image(image: Image.Image) -> list[str]:
    """Run the local Tesseract binary without a Python package dependency."""
    image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    process = subprocess.run(
        ["tesseract", "stdin", "stdout", "-l", "eng", "--psm", "6"],
        input=buffer.getvalue(),
        capture_output=True,
        check=False,
        timeout=45,
    )
    if process.returncode:
        message = process.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(message or "Tesseract could not read this document.")
    return [line.strip() for line in process.stdout.decode("utf-8").splitlines() if line.strip()]


@router.post("/ocr/fast")
async def read_certificate_fast(file: UploadFile = File(...)) -> dict[str, object]:
    """OCR with Tesseract: lower startup cost and fast CPU processing for English."""
    if file.content_type not in SUPPORTED_CONTENT_TYPES:
        raise HTTPException(415, "Only PDF, JPG, PNG, and WEBP files are supported.")

    content = await file.read()
    if not content:
        raise HTTPException(400, "The uploaded file is empty.")

    try:
        lines = [line for image in _load_images(content, file.content_type) for line in read_tesseract_image(image)]
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(422, "Tesseract timed out while reading this document.") from exc
    except Exception as exc:
        raise HTTPException(422, f"Fast OCR could not read this document: {exc}") from exc

    return {
        "result": {
            "raw_text": "\n".join(lines),
            "ocr_lines": lines,
            "engine": "tesseract",
        }
    }
