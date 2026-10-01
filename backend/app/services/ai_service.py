"""
PolicyLens — AI Service (Step 3)
Handles AI-powered requirement decomposition from policy documents.

Architecture:
    Route → Document Service → AI Service → Pydantic-validated Response

The service is provider-agnostic; swap the _call_google / _call_openai
implementation without touching routes or schemas.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.requirements import (
    DocumentAnalysisResponse,
    RequirementItem,
    VALID_STATUSES,
)

logger = logging.getLogger("policylens.ai_service")

# ---------------------------------------------------------------------------
# System prompt — policy compliance extraction
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are PolicyLens, an AI compliance document analysis assistant.

Your task is to identify explicit and actionable compliance requirements from the provided policy or regulatory document.

Do not invent requirements.
Do not provide legal advice.
Do not assume facts that are not present in the document.
Only extract requirements supported by the document.

For every requirement:
1. State the requirement clearly and concisely.
2. Convert it into a practical action the organisation must perform.
3. Identify who or what the requirement applies to.
4. Identify a deadline ONLY if explicitly stated in the document — otherwise return exactly: "Not specified"
5. Identify a responsible department ONLY when reasonably supported by the document — otherwise return exactly: "Not specified"
6. Identify evidence needed to demonstrate compliance when reasonably inferable — otherwise return exactly: "Not specified"
7. Assign a confidence score between 0.0 and 1.0 (use lower confidence for ambiguous clauses).
8. Provide the page number(s) where the requirement appears, using ONLY the page numbers visible in the document text.

Status rules:
- Use "Needs Review" for ambiguous, unclear, or uncertain requirements.
- Use "Pending" for clear, unambiguous requirements that the organisation has not yet completed.
- Use "Completed" ONLY if the document explicitly states the organisation has already fulfilled the requirement.

Do NOT convert every sentence into a compliance requirement. Focus on actionable obligations expressed with language such as: must, shall, required to, prohibited, may not, obligated to, must maintain, must submit, must notify, must implement, must retain. Requirements can also be expressed indirectly.

Distinguish between:
- Actual requirements (EXTRACT THESE)
- Explanatory text (SKIP)
- Definitions (SKIP)
- Examples (SKIP)
- Background information (SKIP)
- Optional recommendations (SKIP unless they contain mandatory sub-clauses)

CRITICAL — You must NEVER:
- Invent deadlines not stated in the document
- Invent departments not mentioned or clearly implied
- Invent penalties, organisations, page numbers, or regulatory sections

Return ONLY a single valid JSON object matching this exact schema:
{
  "document_summary": "<one-paragraph summary of the document>",
  "requirements": [
    {
      "requirement": "<clear obligation statement>",
      "action": "<practical action to perform>",
      "applicability": "<who or what this applies to>",
      "deadline": "<explicit deadline or 'Not specified'>",
      "responsible_department": "<department or 'Not specified'>",
      "evidence_required": "<evidence needed or 'Not specified'>",
      "status": "<'Pending' | 'Needs Review' | 'Completed'>",
      "source_pages": [<list of integer page numbers>],
      "confidence": <float 0.0-1.0>
    }
  ]
}

Return ONLY valid JSON. No markdown, no code fences, no prose outside the JSON."""


# ---------------------------------------------------------------------------
# Document chunking
# ---------------------------------------------------------------------------

def _format_page_text(pages: List[Dict[str, Any]]) -> str:
    """
    Formats a list of {page, text} dicts into a page-delimited string
    the AI can use to correctly attribute source_pages.
    """
    parts: List[str] = []
    for p in pages:
        page_num = p.get("page", "?")
        text = (p.get("text") or "").strip()
        if text:
            parts.append(f"--- PAGE {page_num} ---\n{text}")
    return "\n\n".join(parts)


def chunk_document(
    pages: List[Dict[str, Any]], max_chars: int = None
) -> List[Dict[str, Any]]:
    """
    Splits document pages into chunks that fit within max_chars.
    Each chunk is: {"pages": [int, ...], "text": str}

    Chunks respect page boundaries — a page is never split mid-content.
    If a single page exceeds max_chars, it is placed in its own chunk.
    """
    if max_chars is None:
        max_chars = settings.AI_CHUNK_CHARS

    chunks: List[Dict[str, Any]] = []
    current_pages: List[int] = []
    current_parts: List[str] = []
    current_chars = 0

    for p in pages:
        page_num = p.get("page", 0)
        text = (p.get("text") or "").strip()
        if not text:
            continue

        page_block = f"--- PAGE {page_num} ---\n{text}"
        page_chars = len(page_block)

        if current_chars + page_chars > max_chars and current_pages:
            # Flush current chunk
            chunks.append({
                "pages": list(current_pages),
                "text": "\n\n".join(current_parts),
            })
            current_pages = []
            current_parts = []
            current_chars = 0

        current_pages.append(page_num)
        current_parts.append(page_block)
        current_chars += page_chars

    if current_pages:
        chunks.append({
            "pages": list(current_pages),
            "text": "\n\n".join(current_parts),
        })

    return chunks


# ---------------------------------------------------------------------------
# JSON extraction helpers
# ---------------------------------------------------------------------------

def _extract_json_from_response(raw: str) -> Dict[str, Any]:
    """
    Robustly extracts a JSON object from the AI response.
    Handles responses that include markdown code fences.
    """
    # Strip markdown fences if present
    cleaned = raw.strip()
    # Remove ```json ... ``` or ``` ... ``` wrappers
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    return json.loads(cleaned)


def _validate_ai_output(raw_data: Dict[str, Any]) -> DocumentAnalysisResponse:
    """
    Validates raw AI JSON using Pydantic.
    Applies safe coercions before strict validation:
    - Missing optional fields default to 'Not specified'
    - Invalid status values are coerced to 'Needs Review'
    - Confidence is clamped to [0.0, 1.0]
    """
    summary = raw_data.get("document_summary", "").strip()
    if not summary:
        summary = "Document analysis complete. See requirements below."

    raw_reqs = raw_data.get("requirements", [])
    if not isinstance(raw_reqs, list):
        raw_reqs = []

    validated_reqs: List[RequirementItem] = []
    for i, req in enumerate(raw_reqs):
        if not isinstance(req, dict):
            logger.warning("Skipping non-dict requirement at index %d", i)
            continue

        # Safe coercions before Pydantic model validation
        confidence = req.get("confidence", 0.5)
        try:
            confidence = float(confidence)
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.5

        source_pages = req.get("source_pages", [])
        if not isinstance(source_pages, list) or not source_pages:
            logger.warning("Requirement %d has no valid source_pages; skipping.", i)
            continue

        status_val = req.get("status", "Needs Review")
        if status_val not in VALID_STATUSES:
            status_val = "Needs Review"

        try:
            item = RequirementItem(
                requirement=req.get("requirement", "Unspecified requirement"),
                action=req.get("action", "Review this requirement."),
                applicability=req.get("applicability", "Not specified"),
                deadline=req.get("deadline"),
                responsible_department=req.get("responsible_department"),
                evidence_required=req.get("evidence_required"),
                status=status_val,
                source_pages=source_pages,
                confidence=confidence,
            )
            validated_reqs.append(item)
        except Exception as exc:
            logger.warning("Pydantic validation failed for requirement %d: %s", i, exc)
            continue

    return DocumentAnalysisResponse(
        success=True,
        document_summary=summary,
        requirements=validated_reqs,
    )


# ---------------------------------------------------------------------------
# Requirement de-duplication / merging
# ---------------------------------------------------------------------------

def _merge_requirements(
    all_reqs: List[RequirementItem],
) -> List[RequirementItem]:
    """
    Merges obviously duplicate requirements produced when chunking.
    Two requirements are considered duplicates when their normalised
    requirement text is identical (case-insensitive, stripped).

    When merging, source_pages and confidence are combined:
    - source_pages: union of both sets
    - confidence: average of both values
    """
    seen: Dict[str, RequirementItem] = {}

    for req in all_reqs:
        key = req.requirement.strip().lower()
        if key in seen:
            existing = seen[key]
            merged_pages = sorted(set(existing.source_pages) | set(req.source_pages))
            merged_confidence = round((existing.confidence + req.confidence) / 2, 4)
            # Keep existing fields but merge pages/confidence
            seen[key] = RequirementItem(
                requirement=existing.requirement,
                action=existing.action,
                applicability=existing.applicability,
                deadline=existing.deadline,
                responsible_department=existing.responsible_department,
                evidence_required=existing.evidence_required,
                status=existing.status,
                source_pages=merged_pages,
                confidence=merged_confidence,
            )
        else:
            seen[key] = req

    return list(seen.values())


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

def _call_google_ai(prompt_text: str) -> str:
    """
    Calls the Google Generative AI API (gemini models) synchronously.
    Requires: google-generativeai package and AI_API_KEY env var.
    """
    try:
        import google.generativeai as genai  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Generative AI library is not installed. Run: pip install google-generativeai",
        ) from exc

    genai.configure(api_key=settings.AI_API_KEY, transport="rest")

    model = genai.GenerativeModel(
        model_name=settings.AI_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    response = model.generate_content(prompt_text)
    return response.text


def _call_openai(prompt_text: str) -> str:
    """
    Calls the OpenAI Chat Completions API synchronously.
    Requires: openai package and AI_API_KEY env var.
    """
    try:
        from openai import OpenAI  # type: ignore
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI library is not installed. Run: pip install openai",
        ) from exc

    client = OpenAI(api_key=settings.AI_API_KEY)
    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt_text},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return response.choices[0].message.content or ""


def _call_ai_provider(prompt_text: str) -> str:
    """
    Dispatches to the configured AI provider.
    Extend this function to support additional providers.
    """
    provider = settings.AI_PROVIDER.lower().strip()

    if provider == "google":
        return _call_google_ai(prompt_text)
    elif provider == "openai":
        return _call_openai(prompt_text)
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unsupported AI provider: '{provider}'. Set AI_PROVIDER to 'google' or 'openai'.",
        )


def _call_ai_with_retry(prompt_text: str) -> str:
    """
    Calls the AI provider with simple retry logic for transient errors.
    """
    max_retries = settings.AI_MAX_RETRIES
    last_error: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            return _call_ai_provider(prompt_text)
        except HTTPException:
            raise  # re-raise config/library errors immediately
        except Exception as exc:
            last_error = exc
            if attempt < max_retries:
                wait = 2 ** attempt  # 1s, 2s, …
                logger.warning(
                    "AI provider call failed (attempt %d/%d), retrying in %ds: %s",
                    attempt + 1,
                    max_retries + 1,
                    wait,
                    exc,
                )
                time.sleep(wait)
            else:
                logger.error("AI provider call failed after %d attempts: %s", max_retries + 1, exc)

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="AI provider is temporarily unavailable. Please try again later.",
    ) from last_error


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_document(
    document_pages: List[Dict[str, Any]],
    filename: Optional[str] = None,
) -> DocumentAnalysisResponse:
    """
    Main entry point for AI-powered requirement decomposition.

    Pipeline:
        document_pages → chunk → AI calls → parse JSON → Pydantic → merge → return

    Args:
        document_pages: List of {page: int, text: str} dicts from the upload pipeline.
        filename: Optional original filename for logging.

    Returns:
        DocumentAnalysisResponse with document_summary and validated requirements.
    """
    label = filename or "unknown document"

    # -------------------------
    # Guard: empty document
    # -------------------------
    if not document_pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is empty. No pages were provided for analysis.",
        )

    # Filter out empty pages
    non_empty_pages = [p for p in document_pages if (p.get("text") or "").strip()]
    if not non_empty_pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document contains no extractable text content.",
        )

    # -------------------------
    # Guard: API key
    # -------------------------
    if not settings.AI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured. Set the AI_API_KEY environment variable.",
        )

    total_chars = sum(len(p.get("text") or "") for p in non_empty_pages)
    logger.info(
        "[AI] Analysis started — file=%s pages=%d chars=%d",
        label,
        len(non_empty_pages),
        total_chars,
    )

    # -------------------------
    # Chunk document
    # -------------------------
    chunks = chunk_document(non_empty_pages)
    logger.info("[AI] Document split into %d chunk(s) for analysis.", len(chunks))

    all_requirements: List[RequirementItem] = []
    all_summaries: List[str] = []

    for chunk_idx, chunk in enumerate(chunks):
        chunk_pages = chunk["pages"]
        chunk_text = chunk["text"]

        user_prompt = (
            f"Analyse the following policy document extract (pages {chunk_pages}) "
            f"and extract all actionable compliance requirements.\n\n"
            f"{chunk_text}"
        )

        logger.info(
            "[AI] Sending chunk %d/%d to provider — pages=%s chars=%d",
            chunk_idx + 1,
            len(chunks),
            chunk_pages,
            len(chunk_text),
        )

        # Call AI provider with retry
        raw_response = _call_ai_with_retry(user_prompt)

        logger.info(
            "[AI] Response received for chunk %d/%d — raw_length=%d chars",
            chunk_idx + 1,
            len(chunks),
            len(raw_response),
        )

        # -------------------------
        # Parse and validate JSON
        # -------------------------
        try:
            raw_data = _extract_json_from_response(raw_response)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning(
                "[AI] JSON parse failed for chunk %d, retrying once: %s", chunk_idx + 1, exc
            )
            # Retry once more explicitly for JSON issues
            try:
                raw_response2 = _call_ai_with_retry(
                    user_prompt
                    + "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the JSON object, no other text."
                )
                raw_data = _extract_json_from_response(raw_response2)
            except Exception as exc2:
                logger.error(
                    "[AI] JSON parse failed on retry for chunk %d: %s", chunk_idx + 1, exc2
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="AI returned an invalid response format. Please try again.",
                ) from exc2

        chunk_result = _validate_ai_output(raw_data)
        all_requirements.extend(chunk_result.requirements)
        if chunk_result.document_summary:
            all_summaries.append(chunk_result.document_summary)

    # -------------------------
    # Merge duplicate requirements across chunks
    # -------------------------
    merged_requirements = _merge_requirements(all_requirements)

    # Combine summaries if multiple chunks
    final_summary = " ".join(all_summaries) if all_summaries else "Analysis complete."

    logger.info(
        "[AI] Analysis complete — file=%s requirements_extracted=%d",
        label,
        len(merged_requirements),
    )

    return DocumentAnalysisResponse(
        success=True,
        document_summary=final_summary,
        requirements=merged_requirements,
    )
