from pathlib import Path
from pydantic_settings import BaseSettings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.output_parsers import StrOutputParser


class Settings(BaseSettings):
    gemini_api_key: str
    embedding_model: str = "gemini-embedding-001"
    llm_model: str = "gemini-2.5-flash"
    chunk_size: int = 1500
    chunk_overlap: int = 150
    retriever_k: int = 4
    storage_dir: str = "indexes"
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()

embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.embedding_model,
    google_api_key=settings.gemini_api_key
)

llm = ChatGoogleGenerativeAI(
    model=settings.llm_model,
    google_api_key=settings.gemini_api_key
)

parser = StrOutputParser()

INDEXES_DIR = Path(settings.storage_dir)
INDEXES_DIR.mkdir(exist_ok=True, parents=True)