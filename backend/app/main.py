from fastapi import FastAPI
from app.routers import pdf

app = FastAPI(title="Persistent PDF Q&A API")
app.include_router(pdf.router, prefix="/api/v1/pdf", tags=["PDF"])