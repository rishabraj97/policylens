"""
PolicyLens - RAG Service (Step 6)
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.compliance import Document, DocumentChunk

logger = logging.getLogger("policylens.rag_service")

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
EMBEDDINGS_DIR = BASE_DIR / "embeddings"

RAG_CHUNK_SIZE = 800
RAG_CHUNK_OVERLAP = 150
TOP_K_CHUNKS = 5
RELEVANCE_THRESHOLD = 0.30
MAX_CONVERSATION_HISTORY = 10

CHAT_SYSTEM_PROMPT = (
    "You are PolicyLens AI, a document-grounded compliance assistant.\n\n"
    "Your task is to answer questions using ONLY the supplied document context retrieved from the user uploaded document.\n\n"
    "STRICT RULES:\n"
    "1. Use the uploaded document as the primary and authoritative source. Answer only what the document contains.\n"
    "2. Do NOT invent information that is not present in the retrieved document sections.\n"
    "3. Do NOT fabricate requirements, deadlines, responsibilities, evidence, page numbers, or policy statements.\n"
    "4. Do NOT use general knowledge to fill gaps. If the document does not contain the answer, say so clearly.\n"
    "5. If the retrieved context does not contain enough information, say: I could not find enough information about that in the uploaded document.\n"
    "6. Use conversation history only to resolve references such as 'it', 'they', 'this', 'that'. Never use history to override the document.\n"
    "7. Clearly distinguish between what the document explicitly states and what is an interpretation.\n"
    "8. Provide source page numbers whenever available (e.g., 'According to page 7 of the document...').\n"
    "9. Never claim legal certainty. Never provide unsupported compliance advice.\n"
    "10. If the user asks something unrelated to the uploaded document, say: I am designed to answer questions about the selected PolicyLens document. I could not find information about that in this document.\n"
    "11. Start answers with phrases like 'According to the document...' to make grounding clear.\n"
    "12. Keep answers clear, professional, and concise. Use bullet points for lists."
)

_embedding_model = None


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is not None:
        return _embedding_model
    try:
        from sentence_transformers import SentenceTransformer
        model_name = "all-MiniLM-L6-v2"
        logger.info("[RAG] Loading embedding model: %s", model_name)
        _embedding_model = SentenceTransformer(model_name)
        logger.info("[RAG] Embedding model loaded.")
        return _embedding_model
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="sentence-transformers is not installed. Run: pip install sentence-transformers",
        )
    except Exception as exc:
        logger.error("[RAG] Failed to load embedding model: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Embedding model failed to load: {str(exc)}",
        )


def chunk_document_for_rag(
    pages: List[Dict[str, Any]],
    chunk_size: int = RAG_CHUNK_SIZE,
    overlap: int = RAG_CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Splits document pages into overlapping text chunks preserving page numbers.
    """
    chunks: List[Dict[str, Any]] = []
    chunk_index = 0
    for page_data in pages:
        page_num = page_data.get("page", 1)
        text = (page_data.get("text") or "").strip()
        if not text:
            continue
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "chunk_index": chunk_index,
                    "page_number": page_num,
                    "text": chunk_text,
                })
                chunk_index += 1
            if end >= len(text):
                break
            start = end - overlap
    return chunks


def _embed_texts(texts: List[str]) -> np.ndarray:
    model = _get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.astype(np.float32)


def _embed_text(text: str) -> np.ndarray:
    return _embed_texts([text])[0]


def _embedding_path_for_document(document_id: int) -> Path:
    EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
    return EMBEDDINGS_DIR / f"doc_{document_id}_embeddings.npy"


def _save_embeddings(document_id: int, embeddings: np.ndarray) -> Path:
    path = _embedding_path_for_document(document_id)
    np.save(str(path), embeddings)
    logger.info("[RAG] Saved embeddings for document %d", document_id)
    return path


def _load_embeddings(document_id: int) -> Optional[np.ndarray]:
    path = _embedding_path_for_document(document_id)
    if not path.exists():
        return None
    try:
        return np.load(str(path))
    except Exception as exc:
        logger.warning("[RAG] Failed to load embeddings for doc %d: %s", document_id, exc)
        return None


def _cosine_similarity(query_vec: np.ndarray, doc_vecs: np.ndarray) -> np.ndarray:
    query_norm = query_vec / (np.linalg.norm(query_vec) + 1e-10)
    doc_norms = doc_vecs / (np.linalg.norm(doc_vecs, axis=1, keepdims=True) + 1e-10)
    return np.dot(doc_norms, query_norm)


def index_document(
    db: Session,
    document: Document,
    pages: List[Dict[str, Any]],
) -> int:
    """
    Indexes a document for RAG: chunks -> embeddings -> store.
    Idempotent: deletes existing chunks and embeddings before re-indexing.
    """
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    db.commit()

    old_emb_path = _embedding_path_for_document(document.id)
    if old_emb_path.exists():
        try:
            old_emb_path.unlink()
        except Exception:
            pass

    logger.info("[RAG] Indexing document %d (%s)...", document.id, document.filename)
    chunks = chunk_document_for_rag(pages)
    if not chunks:
        logger.warning("[RAG] No chunks produced for document %d.", document.id)
        return 0

    logger.info("[RAG] Created %d chunks for document %d.", len(chunks), document.id)
    chunk_texts = [c["text"] for c in chunks]
    embeddings = _embed_texts(chunk_texts)
    emb_path = _save_embeddings(document.id, embeddings)

    for chunk_data in chunks:
        db_chunk = DocumentChunk(
            document_id=document.id,
            chunk_index=chunk_data["chunk_index"],
            page_number=chunk_data["page_number"],
            text=chunk_data["text"],
            embedding_path=str(emb_path),
        )
        db.add(db_chunk)

    db.commit()
    logger.info("[RAG] Indexing complete for document %d: %d chunks.", document.id, len(chunks))
    return len(chunks)


def get_rag_status(db: Session, document_id: int) -> str:
    """Returns 'ready', 'indexing', or 'unavailable'."""
    chunk_count = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .count()
    )
    if chunk_count == 0:
        return "unavailable"
    emb_path = _embedding_path_for_document(document_id)
    if emb_path.exists():
        return "ready"
    return "indexing"


def retrieve_relevant_chunks(
    db: Session,
    document_id: int,
    query: str,
    top_k: int = TOP_K_CHUNKS,
    threshold: float = RELEVANCE_THRESHOLD,
) -> List[Dict[str, Any]]:
    """
    Retrieves top-K relevant chunks for a query via cosine similarity.
    Filters by relevance threshold to reduce hallucination risk.
    """
    db_chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )
    if not db_chunks:
        logger.warning("[RAG] No chunks found for document %d.", document_id)
        return []

    embeddings = _load_embeddings(document_id)
    if embeddings is None:
        logger.warning("[RAG] No embeddings on disk for document %d.", document_id)
        return []

    if len(db_chunks) != len(embeddings):
        min_len = min(len(db_chunks), len(embeddings))
        db_chunks = db_chunks[:min_len]
        embeddings = embeddings[:min_len]

    query_vec = _embed_text(query)
    similarities = _cosine_similarity(query_vec, embeddings)

    scored = [
        (float(similarities[i]), db_chunks[i])
        for i in range(len(db_chunks))
    ]
    scored = [(score, chunk) for score, chunk in scored if score >= threshold]
    scored.sort(key=lambda x: x[0], reverse=True)
    top_results = scored[:top_k]

    seen_keys = set()
    deduplicated = []
    for score, chunk in top_results:
        key = (chunk.page_number, chunk.text[:100])
        if key not in seen_keys:
            seen_keys.add(key)
            deduplicated.append({
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "text": chunk.text,
                "relevance": round(score, 4),
            })

    return deduplicated


def _build_chat_prompt(
    retrieved_chunks: List[Dict[str, Any]],
    conversation_history: List[Dict[str, str]],
    user_message: str,
    filename: str = "the document",
) -> str:
    if retrieved_chunks:
        context_parts = []
        for chunk in retrieved_chunks:
            page = chunk["page_number"]
            text = chunk["text"]
            context_parts.append(f"[Page {page}]\n{text}")
        context_str = "\n\n---\n\n".join(context_parts)
        context_section = f"RELEVANT DOCUMENT SECTIONS (from '{filename}'):\n\n{context_str}"
    else:
        context_section = f"RELEVANT DOCUMENT SECTIONS: No relevant sections found in '{filename}' for this query."

    recent_history = conversation_history[-(MAX_CONVERSATION_HISTORY):]
    history_parts = []
    for msg in recent_history:
        role = msg.get("role", "user").upper()
        content = msg.get("content", "")
        history_parts.append(f"{role}: {content}")

    history_section = ""
    if history_parts:
        history_section = "\n\nCONVERSATION HISTORY:\n" + "\n".join(history_parts)

    prompt = (
        f"{context_section}"
        f"{history_section}"
        f"\n\nCURRENT QUESTION: {user_message}"
        f"\n\nAnswer the question using ONLY the document sections provided above. "
        f"If the answer is not in the document sections, say so clearly."
    )
    return prompt


def _call_google_chat(system_prompt: str, user_prompt: str) -> str:
    try:
        import google.generativeai as genai
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Generative AI library is not installed.",
        ) from exc
    genai.configure(api_key=settings.AI_API_KEY, transport="rest")
    model = genai.GenerativeModel(
        model_name=settings.AI_MODEL,
        system_instruction=system_prompt,
    )
    response = model.generate_content(user_prompt)
    return response.text


def _call_openai_chat(system_prompt: str, user_prompt: str) -> str:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI library is not installed.",
        ) from exc
    client = OpenAI(api_key=settings.AI_API_KEY)
    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=1500,
    )
    return response.choices[0].message.content or ""


def _call_chat_provider(system_prompt: str, user_prompt: str) -> str:
    provider = settings.AI_PROVIDER.lower().strip()
    if provider == "google":
        return _call_google_chat(system_prompt, user_prompt)
    elif provider == "openai":
        return _call_openai_chat(system_prompt, user_prompt)
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unsupported AI provider: {provider}.",
        )


def chat_with_document(
    db: Session,
    document_id: int,
    user_message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Main entry point for document-grounded chat.
    Retrieves relevant chunks, builds grounded prompt, calls LLM, returns structured response.
    """
    if not user_message or not user_message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    if not settings.AI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured. Set the AI_API_KEY environment variable.",
        )

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found.",
        )

    filename = doc.filename
    history = conversation_history or []

    logger.info("[RAG] Chat — doc_id=%d msg_len=%d history=%d", document_id, len(user_message), len(history))

    try:
        retrieved = retrieve_relevant_chunks(
            db=db,
            document_id=document_id,
            query=user_message,
            top_k=TOP_K_CHUNKS,
            threshold=RELEVANCE_THRESHOLD,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[RAG] Retrieval failed for doc %d: %s", document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document search failed. Please try again.",
        )

    if retrieved:
        avg_relevance = sum(c["relevance"] for c in retrieved) / len(retrieved)
        confidence = round(min(avg_relevance * 1.1, 1.0), 4)
        grounded = True
    else:
        confidence = 0.0
        grounded = False

    if not retrieved:
        rag_status = get_rag_status(db, document_id)
        if rag_status == "unavailable":
            answer = (
                "The document has not been indexed yet for AI search. "
                "Please try indexing the document first."
            )
        else:
            answer = (
                "I could not find enough relevant information in the uploaded document to answer that question. "
                "The document may not contain this information, or try rephrasing your question."
            )
        return {
            "message": user_message,
            "answer": answer,
            "sources": [],
            "confidence": 0.0,
            "grounded": False,
        }

    user_prompt = _build_chat_prompt(
        retrieved_chunks=retrieved,
        conversation_history=history,
        user_message=user_message,
        filename=filename,
    )

    try:
        raw_answer = _call_chat_provider(CHAT_SYSTEM_PROMPT, user_prompt)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[RAG] LLM call failed for doc %d: %s", document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI provider is temporarily unavailable. Please try again.",
        )

    sources = [
        {
            "page": chunk["page_number"],
            "text": chunk["text"][:400] + ("..." if len(chunk["text"]) > 400 else ""),
            "relevance": chunk["relevance"],
        }
        for chunk in retrieved
    ]

    logger.info("[RAG] Done — doc_id=%d confidence=%.2f sources=%d", document_id, confidence, len(sources))

    return {
        "message": user_message,
        "answer": raw_answer.strip(),
        "sources": sources,
        "confidence": confidence,
        "grounded": grounded,
    }
