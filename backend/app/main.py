from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pdf
from app.config import settings

app = FastAPI(title="Persistent PDF Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf.router, prefix="/api/v1/pdf", tags=["PDF"])