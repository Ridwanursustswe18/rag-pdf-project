from typing import List
from fastapi import HTTPException
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from operator import itemgetter

from app.config import embeddings, llm, parser, settings
from app.utils.helpers import get_index_path, index_exists
from app.schemas.pdf import AskResponse, QAResult

PROMPT_TEMPLATE = """Answer the question based only on the following context from the PDF.
If the information is not in the context, say "I don't have that information in this document."

Context:
{context}

Question: {question}

Answer:"""


def _load_retriever(pdf_filename: str):
    index_path = get_index_path(pdf_filename)

    if not index_exists(index_path):
        raise HTTPException(404, detail="PDF index not found. Please upload it first.")

    vectorstore = FAISS.load_local(
        folder_path=str(index_path),
        embeddings=embeddings,
        allow_dangerous_deserialization=True,
    )
    return vectorstore.as_retriever(search_kwargs={"k": settings.retriever_k}), index_path


def _build_chain(retriever):
    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    return (
        {
            "context": itemgetter("question") | retriever,
            "question": itemgetter("question"),
        }
        | prompt
        | llm
        | parser
    )


async def answer_questions(pdf_filename: str, questions: List[str]) -> AskResponse:
    try:
        retriever, index_path = _load_retriever(pdf_filename)
        chain = _build_chain(retriever)
        index_hash = index_path.name.split("_")[1]

        if len(questions) == 1:
            answer = chain.invoke({"question": questions[0]})
            results = [QAResult(question=questions[0], answer=answer)]
        else:
            inputs = [{"question": q} for q in questions]
            answers = chain.batch(inputs)
            results = [
                QAResult(question=q, answer=a)
                for q, a in zip(questions, answers)
            ]

        return AskResponse(
            status="success",
            pdf_filename=pdf_filename,
            index_hash=index_hash,
            num_questions=len(questions),
            results=results,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Processing failed: {str(e)}")