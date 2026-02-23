from typing import List
from pydantic import BaseModel, field_validator


class AskRequest(BaseModel):
    pdf_filename: str
    questions: List[str]

    @field_validator("questions")
    @classmethod
    def questions_must_not_be_empty(cls, v):
        if not v or not all(q.strip() for q in v):
            raise ValueError("Questions cannot be empty")
        return v


class QAResult(BaseModel):
    question: str
    answer: str


class UploadResponse(BaseModel):
    status: str
    message: str
    pdf_filename: str
    index_hash: str
    cached: bool
    num_chunks: int | None = None


class AskResponse(BaseModel):
    status: str
    pdf_filename: str
    index_hash: str
    num_questions: int
    results: List[QAResult]