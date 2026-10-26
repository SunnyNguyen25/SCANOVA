"""Command-line OCR runner for English certificates."""

import argparse
import json
import os
import threading
import time
from io import BytesIO
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
import fitz
import numpy as np
from PIL import Image

from ielts_extractor import extract_ielts_text, read_with_ai
from tesseract_ocr import read_tesseract_image

load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)

_paddle_ocr: Any = None


class ElapsedTimer:
    """Display an updating elapsed-time counter while a terminal task runs."""

    def __init__(self, label: str) -> None:
        self.label = label
        self.elapsed = 0.0
        self._started_at = 0.0
        self._stopped = threading.Event()
        self._thread: threading.Thread | None = None

    def _display(self) -> None:
        while not self._stopped.wait(0.2):
            elapsed = time.perf_counter() - self._started_at
            print(f"\r{self.label}: {elapsed:.1f}s", end="", flush=True)

    def __enter__(self) -> "ElapsedTimer":
        self._started_at = time.perf_counter()
        print(f"{self.label}: 0.0s", end="", flush=True)
        self._thread = threading.Thread(target=self._display, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, *_: object) -> None:
        self._stopped.set()
        if self._thread:
            self._thread.join()
        self.elapsed = time.perf_counter() - self._started_at
        print(f"\r{self.label}: {self.elapsed:.2f}s")


def load_images(source: Path) -> list[Image.Image]:
    if source.suffix.lower() == ".pdf":
        document = fitz.open(source)
        return [
            Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            for page in document
            for pix in [page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)]
        ]
    return [Image.open(source).convert("RGB")]


def read_with_paddle(image: Image.Image) -> list[str]:
    global _paddle_ocr
    if _paddle_ocr is None:
        from paddleocr import PaddleOCR

        _paddle_ocr = PaddleOCR(lang="en")
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    result = _paddle_ocr.predict(np.asarray(image))
    return [str(text).strip() for page in result for text in page.get("rec_texts", []) if text]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OCR an English certificate and optionally extract IELTS fields.")
    parser.add_argument("input", type=Path, help="Path to a JPG, PNG, WEBP, or PDF certificate.")
    parser.add_argument(
        "--ocr-engine",
        choices=("paddle", "tesseract", "ai"),
        default=os.getenv("OCR_ENGINE", "paddle").lower(),
        help="OCR engine. Defaults to OCR_ENGINE in .env, or paddle.",
    )
    parser.add_argument("--extract-ielts", action="store_true", help="Use Gemini to extract structured IELTS fields.")
    parser.add_argument("--output", type=Path, help="Output JSON path. Defaults beside the input file.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.input.expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Input file not found: {source}")
    if source.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".pdf"}:
        raise SystemExit("Only PDF, JPG, PNG, and WEBP files are supported.")

    total_started_at = time.perf_counter()
    readers = {
        "paddle": read_with_paddle,
        "tesseract": read_tesseract_image,
        "ai": read_with_ai,
    }
    reader = readers[args.ocr_engine]
    with ElapsedTimer("OCR processing") as ocr_timer:
        lines = [line for image in load_images(source) for line in reader(image)]
    raw_text = "\n".join(lines)
    payload: dict[str, Any] = {
        "source": str(source),
        "result": {"raw_text": raw_text, "ocr_lines": lines, "engine": args.ocr_engine},
        "timing_seconds": {"ocr": round(ocr_timer.elapsed, 2)},
    }
    if args.extract_ielts:
        with ElapsedTimer("Gemini IELTS extraction") as extraction_timer:
            payload["ielts_extraction"] = extract_ielts_text(raw_text)
        payload["timing_seconds"]["gemini_extraction"] = round(extraction_timer.elapsed, 2)

    output = args.output.expanduser().resolve() if args.output else source.with_suffix(f"{source.suffix}.ocr.json")
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OCR engine: {args.ocr_engine}")
    print(f"Lines found: {len(lines)}")
    print(f"Total time: {time.perf_counter() - total_started_at:.2f}s")
    print(f"Output: {output}")


if __name__ == "__main__":
    main()
