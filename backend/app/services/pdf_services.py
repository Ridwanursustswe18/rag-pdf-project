import time
import asyncio
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings, embeddings
from app.utils.helpers import get_index_path, index_exists
from app.schemas.pdf import UploadResponse
from app.services.task_store import create_task, get_task

MAX_CHUNK_CHARS = 6000
BATCH_SIZE = 2
MAX_RETRIES = 3
SYNC_CHAR_THRESHOLD = 10_000
MIN_CHUNK_CHARS = 100


def _estimate_total_chars(docs: list) -> int:
    return sum(len(doc.page_content) for doc in docs)


def _chunk_documents(docs: list) -> list:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=MAX_CHUNK_CHARS,
        chunk_overlap=200,
        add_start_index=True,
    )
    chunks = splitter.split_documents(docs)

    before_filter = len(chunks)
    chunks = [c for c in chunks if len(c.page_content.strip()) >= MIN_CHUNK_CHARS]
    print(f"Filtered {before_filter - len(chunks)} short chunks")

    seen = set()
    unique_chunks = []
    for chunk in chunks:
        fingerprint = hash(chunk.page_content.strip()[:100])
        if fingerprint not in seen:
            seen.add(fingerprint)
            unique_chunks.append(chunk)

    print(f"Removed {len(chunks) - len(unique_chunks)} duplicate chunks")
    print(f"Final chunk count: {len(unique_chunks)}")
    return unique_chunks


def _embed_batch_with_retry(batch: list, batch_num: int) -> FAISS:
    for attempt in range(MAX_RETRIES):
        try:
            return FAISS.from_documents(batch, embeddings)
        except Exception as e:
            is_rate_limit = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
            is_last_attempt = attempt == MAX_RETRIES - 1
            if is_rate_limit and not is_last_attempt:
                wait = 60 * (2 ** attempt)
                print(f"[batch {batch_num}] Rate limited. Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise


def _embed_in_batches(chunks: list, task=None) -> FAISS:
    """
    Embed in batches. If a task is passed, updates progress after each batch
    so the frontend can show a live percentage.
    """
    vectorstore = None
    total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE
    completed = 0

    if task:
        task.set_total(len(chunks))

    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i: i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1

        batch_chars = sum(len(c.page_content) for c in batch)
        batch_tokens = batch_chars // 4
        print(f"Embedding batch {batch_num}/{total_batches} (~{batch_tokens} tokens)...")

        batch_store = _embed_batch_with_retry(batch, batch_num)
        vectorstore = batch_store if vectorstore is None else (vectorstore.merge_from(batch_store) or vectorstore)

        completed += len(batch)
        if task:
            task.update_progress(completed)

        if i + BATCH_SIZE < len(chunks):
            dynamic_wait = max((batch_tokens / 1500) * 60, 5)
            print(f"Waiting {dynamic_wait:.1f}s before next batch...")
            time.sleep(dynamic_wait)

    return vectorstore


def _run_indexing(task_id: str, pdf_filename: str, temp_path: Path, index_path: Path):
    task = get_task(task_id)
    try:
        loader = PyPDFLoader(str(temp_path))
        docs = loader.load()
        chunks = _chunk_documents(docs)

        if not chunks:
            task.mark_failed("PDF appears to be empty or unreadable")
            return

        print(f"[{task_id}] {len(chunks)} chunks — starting background embedding...")
        vectorstore = _embed_in_batches(chunks, task=task)  # pass task for live progress
        vectorstore.save_local(str(index_path))
        task.mark_done(len(chunks))
        print(f"[{task_id}] Background indexing complete.")

    except Exception as e:
        task.mark_failed(str(e))
        print(f"[{task_id}] Background indexing failed: {e}")
    finally:
        temp_path.unlink(missing_ok=True)


async def process_pdf_upload(pdf: UploadFile) -> UploadResponse:
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(400, detail="Only PDF files are allowed")

    index_path = get_index_path(pdf.filename)
    index_hash = index_path.name.split("_")[1]

    if index_exists(index_path):
        return UploadResponse(
            status="success",
            message="PDF index already cached",
            pdf_filename=pdf.filename,
            index_hash=index_hash,
            cached=True,
            task_id=None,
        )

    task_id = str(uuid.uuid4())
    temp_path = Path(f"temp_{task_id}.pdf")
    pdf_content = await pdf.read()
    temp_path.write_bytes(pdf_content)

    try:
        loader = PyPDFLoader(str(temp_path))
        docs = loader.load()
    except Exception as e:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(500, detail=f"Failed to read PDF: {str(e)}")

    total_chars = _estimate_total_chars(docs)
    chunks = _chunk_documents(docs)

    if not chunks:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(400, detail="PDF appears to be empty or unreadable")

    print(f"PDF '{pdf.filename}': {total_chars} chars → {len(chunks)} chunks "
          f"({'sync' if total_chars <= SYNC_CHAR_THRESHOLD else 'background'})")

    if total_chars <= SYNC_CHAR_THRESHOLD:
        try:
            vectorstore = FAISS.from_documents(chunks, embeddings)
            vectorstore.save_local(str(index_path))
            temp_path.unlink(missing_ok=True)
            return UploadResponse(
                status="success",
                message=f"PDF uploaded and indexed ({len(chunks)} chunks)",
                pdf_filename=pdf.filename,
                index_hash=index_hash,
                cached=False,
                task_id=None,
                num_chunks=len(chunks),
            )
        except Exception as e:
            temp_path.unlink(missing_ok=True)
            raise HTTPException(500, detail=f"Upload failed: {str(e)}")

    create_task(task_id, pdf.filename)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _run_indexing, task_id, pdf.filename, temp_path, index_path)

    return UploadResponse(
        status="processing",
        message=f"Large PDF detected ({len(chunks)} chunks). Indexing in background...",
        pdf_filename=pdf.filename,
        index_hash=index_hash,
        cached=False,
        task_id=task_id,
        num_chunks=len(chunks),
    )