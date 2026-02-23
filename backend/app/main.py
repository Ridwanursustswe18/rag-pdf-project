from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pdf

app = FastAPI(title="Persistent PDF Q&A API")
origins = [
    "http://localhost:5173",]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,         # List of allowed origins
    allow_credentials=True,        # Allow cookies to be sent with requests
    allow_methods=["*"],           # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],           # Allow all headers
)
app.include_router(pdf.router, prefix="/api/v1/pdf", tags=["PDF"])