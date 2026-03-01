from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pdf
from app.config import settings

app = FastAPI(title="Persistent PDF Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf.router, prefix="/api/v1/pdf", tags=["PDF"])