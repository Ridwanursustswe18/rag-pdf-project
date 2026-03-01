from typing import List, Optional
from pydantic import BaseModel, field_validator


class AskRequest(BaseModel):
    pdf_filename: str
    session_id: str
    questions: List[str]

    @field_validator("questions")
    @classmethod
    def questions_must_not_be_empty(cls, v):
        if not v or not all(q.strip() for q in v):
            raise ValueError("Questions cannot be empty")
        return v


class ClearSessionRequest(BaseModel):
    session_id: str


class QAResult(BaseModel):
    question: str
    answer: str


class UploadResponse(BaseModel):
    status: str
    message: str
    pdf_filename: str
    index_hash: str
    cached: bool
    task_id: Optional[str] = None
    num_chunks: Optional[int] = None


class TaskStatusResponse(BaseModel):
    task_id: str
    pdf_filename: str
    status: str                        
    message: str
    progress: int = 0                 
    completed_chunks: int = 0
    total_chunks: Optional[int] = None
    num_chunks: Optional[int] = None
    error: Optional[str] = None


class AskResponse(BaseModel):
    status: str
    pdf_filename: str
    index_hash: str
    session_id: str
    num_questions: int
    results: List[QAResult]
    history: List[QAResult]


class HistoryResponse(BaseModel):
    session_id: str
    exists: bool                
    history: List[QAResult]