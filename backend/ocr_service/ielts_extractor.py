"""Gemini-powered extraction of structured IELTS certificate data."""

import asyncio
import base64
import json
import os
import time
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel, Field
from dotenv import load_dotenv

router = APIRouter()

# The only dotenv file used by the backend is the project-root .env file.
# Existing shell environment variables still take precedence.
_project_dir = Path(__file__).resolve().parents[2]
load_dotenv(_project_dir / ".env", override=False)


class IELTSExtractRequest(BaseModel):
    ocr_text: str = Field(min_length=1, description="Text returned by an OCR endpoint.")


SCHEMA_PATH = _project_dir / "frontend" / "schemas" / "ielts-fields.json"


def _schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _parse_json(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else ""
        cleaned = cleaned.rsplit("```", 1)[0].strip()
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("The model response was not a JSON object.")
    return parsed


def _ai_config() -> tuple[str, str]:
    provider = os.getenv("AI_PROVIDER", "gemini").lower()
    if provider != "gemini":
        raise RuntimeError(f"Unsupported AI_PROVIDER: {provider}. Use gemini.")
    api_key = os.getenv("GEMINI_API") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API is not configured. Add it to the project-root .env file.")
    model = os.getenv("AI_MODEL") or os.getenv("GEMINI_MODEL", "gemini/gemini-3.6-flash")
    return api_key, model


def _completion() -> Any:
    try:
        from litellm import completion
    except ImportError as exc:
        raise RuntimeError("LiteLLM is not installed. Install requirements.txt first.") from exc
    return completion


def _complete_with_retry(**kwargs: Any) -> Any:
    """Retry Gemini's temporary 503/UNAVAILABLE responses with backoff."""
    try:
        attempts = max(1, int(os.getenv("AI_RETRY_ATTEMPTS", "3")))
        base_delay = max(0, float(os.getenv("AI_RETRY_BASE_DELAY_SECONDS", "2")))
    except ValueError as exc:
        raise RuntimeError("AI retry environment values must be numeric.") from exc

    for attempt in range(attempts):
        try:
            return _completion()(**kwargs)
        except Exception as exc:
            temporary = "503" in str(exc) or "UNAVAILABLE" in str(exc)
            if not temporary or attempt == attempts - 1:
                if temporary:
                    raise RuntimeError(
                        f"Gemini remains unavailable after {attempts} attempts. Please try again shortly."
                    ) from exc
                raise
            time.sleep(base_delay * (2**attempt))

    raise RuntimeError("Gemini request could not be completed.")


def read_with_ai(image: Image.Image) -> list[str]:
    """Use Gemini vision as the OCR engine for an English certificate image."""
    api_key, model = _ai_config()
    image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    encoded_image = base64.b64encode(buffer.getvalue()).decode("ascii")
    response = _complete_with_retry(
        model=model,
        api_key=api_key,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Transcribe every visible English text field from this certificate. "
                            "Preserve reading order. Return only the transcription, with one line per field."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{encoded_image}"},
                    },
                ],
            }
        ],
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("The AI OCR response was empty.")
    return [line.strip() for line in content.splitlines() if line.strip()]


def extract_ielts_text(ocr_text: str) -> dict[str, str | None]:
    api_key, model = _ai_config()
    schema = _schema()
    fields = schema["fields"]
    keys = [field["key"] for field in fields]
    prompt = (
        "Extract data from an English IELTS Test Report Form using only the OCR text. "
        "Do not infer values. Return exactly one JSON object using every key in this schema; "
        "use null when a value is absent or unreadable. Keep values as printed and scores as strings.\n\n"
        f"Schema:\n{json.dumps(schema, ensure_ascii=False)}\n\nOCR text:\n{ocr_text}"
    )

    def request_extraction(instructions: str) -> dict[str, str | None]:
        response = _complete_with_retry(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": instructions}],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("The model returned an empty response.")
        parsed = _parse_json(content)
        return {
            key: None if parsed.get(key) is None else str(parsed[key]).strip()
            for key in keys
        }

    result = request_extraction(prompt)
    if any(value for value in result.values()):
        return result

    # A certificate with non-empty OCR text should not silently become an empty
    # review grid. Give Gemini one explicit repair attempt before failing.
    result = request_extraction(
        f"{prompt}\n\nThe previous response contained only null values. Re-read the OCR text "
        "and populate every field you can identify, especially names, identifiers, dates, "
        "centre number, and IELTS band scores."
    )
    if not any(value for value in result.values()):
        raise ValueError("AI could not identify any IELTS fields from the OCR text. Please retry the upload.")
    return result


@router.post("/extract/ielts")
async def extract_ielts(request: IELTSExtractRequest) -> dict[str, object]:
    """Turn English OCR text into a structured IELTS certificate record."""
    try:
        certificate = await asyncio.to_thread(extract_ielts_text, request.ocr_text)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(422, f"IELTS extraction failed: {exc}") from exc
    except Exception as exc:
        raise HTTPException(502, f"Gemini extraction request failed: {exc}") from exc

    return {"result": certificate, "engine": "gemini"}
