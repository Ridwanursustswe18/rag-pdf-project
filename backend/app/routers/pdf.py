from fastapi import APIRouter, UploadFile, HTTPException

from app.schemas.pdf import (
    AskRequest, ClearSessionRequest,
    UploadResponse, AskResponse, TaskStatusResponse
)
from app.services.pdf_services import process_pdf_upload
from app.services.qa_services import answer_questions
from app.services.session_store import clear_session
from app.services.task_store import get_task

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(pdf: UploadFile):
    return await process_pdf_upload(pdf)


@router.get("/upload-status/{task_id}", response_model=TaskStatusResponse)
async def upload_status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(404, detail="Task not found")
    return TaskStatusResponse(
        task_id=task_id,
        pdf_filename=task.pdf_filename,
        status=task.status,
        message=task.message,
        progress=task.progress,
        completed_chunks=task.completed_chunks,
        total_chunks=task.total_chunks,
        num_chunks=task.num_chunks,
        error=task.error,
    )


@router.post("/ask", response_model=AskResponse)
async def ask_pdf(request: AskRequest):
    return await answer_questions(
        pdf_filename=request.pdf_filename,
        questions=request.questions,
        session_id=request.session_id,
    )


@router.post("/clear-session")
async def clear_chat_session(request: ClearSessionRequest):
    """Clear conversation memory for a session."""
    cleared = clear_session(request.session_id)
    return {
        "status": "success" if cleared else "not_found",
        "session_id": request.session_id,
    }