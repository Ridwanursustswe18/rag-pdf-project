from fastapi import APIRouter

from app.schemas.pdf import AskRequest, ClearSessionRequest, UploadResponse, AskResponse
from app.services.pdf_services import process_pdf_upload
from app.services.qa_services import answer_questions
from app.services.session_store import clear_session
from fastapi import UploadFile

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(pdf: UploadFile):
    return await process_pdf_upload(pdf)


@router.post("/ask", response_model=AskResponse)
async def ask_pdf(request: AskRequest):
    return await answer_questions(
        pdf_filename=request.pdf_filename,
        questions=request.questions,
        session_id=request.session_id,
    )


@router.post("/clear-session")
async def clear_chat_session(request: ClearSessionRequest):
    cleared = clear_session(request.session_id)
    return {
        "status": "success" if cleared else "not_found",
        "session_id": request.session_id,
    }