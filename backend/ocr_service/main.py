"""PaddleOCR service for English certificate documents."""

from io import BytesIO
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
import fitz
import numpy as np
from paddleocr import PaddleOCR
from ielts_extractor import read_with_ai, router as ielts_extractor_router
from tesseract_ocr import read_tesseract_image, router as tesseract_router

app = FastAPI(title="SCANOVA OCR API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to the deployed web origin in production.
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr: PaddleOCR | None = None


def get_paddle_ocr() -> PaddleOCR:
    """Load the larger Paddle model only when the original endpoint is used."""
    global ocr
    if ocr is None:
        ocr = PaddleOCR(lang="en")
    return ocr


def extract_text(result: Any) -> list[str]:
    """Normalize the text returned by PaddleOCR 2.x and 3.x."""
    lines: list[str] = []
    for page in result or []:
        # PaddleOCR 3.x returns OCRResult mappings from ``predict``.
        # ``rec_texts`` already follows the reading order for a page.
        if isinstance(page, dict) and "rec_texts" in page:
            lines.extend(str(text).strip() for text in page["rec_texts"] if text)
            continue
        for item in page or []:
            try:
                lines.append(str(item[1][0]).strip())
            except (IndexError, TypeError):
                continue
    return [line for line in lines if line]


def read_with_selected_engine(image: Image.Image) -> tuple[str, list[str]]:
    """Read an image with the engine configured in the project-root .env file."""
    engine = os.getenv("OCR_ENGINE", "paddle").lower()
    if engine == "tesseract":
        return engine, read_tesseract_image(image)
    if engine == "ai":
        return engine, read_with_ai(image)
    if engine == "paddle":
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        return engine, extract_text(get_paddle_ocr().predict(np.asarray(image)))
    raise ValueError("OCR_ENGINE must be paddle, tesseract, or ai.")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(tesseract_router)
app.include_router(ielts_extractor_router)


@app.post("/ocr")
async def read_certificate(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "application/pdf"}:
        raise HTTPException(415, "Only PDF, JPG, PNG, and WEBP files are supported.")

    content = await file.read()
    if not content:
        raise HTTPException(400, "The uploaded file is empty.")

    try:
        if file.content_type == "application/pdf":
            document = fitz.open(stream=content, filetype="pdf")
            images = [
                Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                for page in document
                for pix in [page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)]
            ]
        else:
            images = [Image.open(BytesIO(content)).convert("RGB")]
        engine = os.getenv("OCR_ENGINE", "paddle").lower()
        lines = [line for image in images for line in read_with_selected_engine(image)[1]]
    except Exception as exc:  # Paddle's errors differ by model/runtime version.
        raise HTTPException(422, f"OCR could not read this document: {exc}") from exc

    return {
        "result": {
            "raw_text": "\n".join(lines),
            "ocr_lines": lines,
            "engine": engine,
        }
    }


PROJECT_DIR = Path(__file__).resolve().parents[2]
DIST_DIR = PROJECT_DIR / "dist"


@app.get("/{path:path}", include_in_schema=False)
def serve_web_app(path: str) -> FileResponse:
    """Serve the built React SPA from the same process as the OCR API."""
    index_file = DIST_DIR / "index.html"
    if not index_file.is_file():
        raise HTTPException(503, "Web build not found. Run: pnpm build")

    candidate = (DIST_DIR / path).resolve()
    if candidate.is_relative_to(DIST_DIR.resolve()) and candidate.is_file():
        return FileResponse(candidate)
    return FileResponse(index_file)
