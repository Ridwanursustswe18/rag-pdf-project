from pathlib import Path
from fastapi import UploadFile, HTTPException
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings, embeddings
from app.utils.helpers import get_index_path, index_exists
from app.schemas.pdf import UploadResponse


async def process_pdf_upload(pdf: UploadFile) -> UploadResponse:
   
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(400, detail="Only PDF files are allowed")

    index_path = get_index_path(pdf.filename)
    index_hash = index_path.name.split("_")[1]

    if index_exists(index_path):
        return UploadResponse(
            status="success",
            message="PDF index already cached",
            pdf_filename=pdf.filename,
            index_hash=index_hash,
            cached=True,
        )

    temp_path = Path("temp_upload.pdf")
    try:
        pdf_content = await pdf.read()
        temp_path.write_bytes(pdf_content)

        loader = PyPDFLoader(str(temp_path))
        docs = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            add_start_index=True,
        )
        pages = splitter.split_documents(docs)

        vectorstore = FAISS.from_documents(pages, embeddings)
        vectorstore.save_local(str(index_path))

        return UploadResponse(
            status="success",
            message="PDF uploaded and indexed successfully",
            pdf_filename=pdf.filename,
            index_hash=index_hash,
            cached=False,
            num_chunks=len(pages),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Upload failed: {str(e)}")
    finally:
        temp_path.unlink(missing_ok=True)