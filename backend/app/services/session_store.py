from typing import Dict
from langchain_community.chat_message_histories import ChatMessageHistory

# In-memory store: { session_id: ChatMessageHistory }
_sessions: Dict[str, ChatMessageHistory] = {}

WINDOW_SIZE = 20


def get_or_create_history(session_id: str) -> ChatMessageHistory:
    
    if session_id not in _sessions:
        _sessions[session_id] = ChatMessageHistory()
    return _sessions[session_id]


def get_history(session_id: str) -> list:
    if session_id not in _sessions:
        return []

    messages = _sessions[session_id].messages
    pairs = []
    for i in range(0, len(messages) - 1, 2):
        pairs.append({
            "question": messages[i].content,
            "answer": messages[i + 1].content if i + 1 < len(messages) else "",
        })
    return pairs[-WINDOW_SIZE:]


def session_exists(session_id: str) -> bool:
    return session_id in _sessions and len(_sessions[session_id].messages) > 0


def clear_session(session_id: str) -> bool:
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False