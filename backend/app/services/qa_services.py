from typing import List
from fastapi import HTTPException
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.chat_message_histories import ChatMessageHistory

from app.config import embeddings, llm, settings
from app.utils.helpers import get_index_path, index_exists
from app.schemas.pdf import AskResponse, QAResult
from app.services.session_store import get_or_create_history, get_history

PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful assistant that answers questions strictly based on the provided PDF document.
If the answer is not found in the document, say "I don't have that information in this document." """),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "Context from PDF:\n{context}\n\nQuestion: {question}"),
])


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
    rag_chain = (
        RunnablePassthrough.assign(
            context=lambda x: "\n\n".join(
                doc.page_content for doc in retriever.invoke(x["question"])
            )
        )
        | PROMPT
        | llm
        | StrOutputParser()
    )
    return RunnableWithMessageHistory(
        runnable=rag_chain,
        get_session_history=get_or_create_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )


async def answer_questions(
    pdf_filename: str,
    questions: List[str],
    session_id: str,
) -> AskResponse:
    """
    Run conversational QA over a previously indexed PDF.
    Memory is scoped per session_id — last 20 exchanges are remembered.
    Questions run sequentially so each answer feeds into history for the next.
    """
    try:
        retriever, index_path = _load_retriever(pdf_filename)
        chain = _build_chain(retriever)
        index_hash = index_path.name.split("_")[1]
        config = {"configurable": {"session_id": session_id}}

        results = []
        for question in questions:
            answer = chain.invoke({"question": question}, config=config)
            results.append(QAResult(question=question, answer=answer))

        return AskResponse(
            status="success",
            pdf_filename=pdf_filename,
            index_hash=index_hash,
            session_id=session_id,
            num_questions=len(questions),
            results=results,
            history=get_history(session_id),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Processing failed: {str(e)}")