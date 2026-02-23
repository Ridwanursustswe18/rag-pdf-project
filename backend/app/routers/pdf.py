from fastapi import APIRouter, UploadFile

from app.schemas.pdf import AskRequest, UploadResponse, AskResponse
from app.services.pdf_services import process_pdf_upload
from app.services.qa_services import answer_questions

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(pdf: UploadFile):
    return await process_pdf_upload(pdf)


@router.post("/ask", response_model=AskResponse)
async def ask_pdf(request: AskRequest):
    return await answer_questions(request.pdf_filename, request.questions)