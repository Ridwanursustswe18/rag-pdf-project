from typing import Dict
from enum import Enum


class TaskStatus(str, Enum):
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class TaskInfo:
    def __init__(self, pdf_filename: str):
        self.pdf_filename = pdf_filename
        self.status = TaskStatus.PROCESSING
        self.message = "PDF is being processed in the background..."
        self.num_chunks: int | None = None
        self.total_chunks: int | None = None
        self.completed_chunks: int = 0
        self.progress: int = 0          
        self.error: str | None = None

    def set_total(self, total: int):
        self.total_chunks = total
        self.progress = 0
        self.message = f"Processing started..."

    def update_progress(self, completed: int):
        self.completed_chunks = completed
        if self.total_chunks:
            self.progress = min(int((completed / self.total_chunks) * 100), 99)
            self.message = f"({self.progress}% complete)"

    def mark_done(self, num_chunks: int):
        self.status = TaskStatus.DONE
        self.num_chunks = num_chunks
        self.progress = 100
        self.message = f"PDF prcessed successfully"

    def mark_failed(self, error: str):
        self.status = TaskStatus.FAILED
        self.error = error
        self.message = f"Indexing failed: {error}"


_tasks: Dict[str, TaskInfo] = {}


def create_task(task_id: str, pdf_filename: str) -> TaskInfo:
    task = TaskInfo(pdf_filename)
    _tasks[task_id] = task
    return task


def get_task(task_id: str) -> TaskInfo | None:
    return _tasks.get(task_id)