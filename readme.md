# AskMyPDF 🔍

An AI-powered conversational PDF question answering application built with FastAPI and React. Upload PDF documents and ask natural language questions about their content using Retrieval Augmented Generation (RAG) with Google Gemini.

---

## Features

- **PDF Upload & Indexing** — Upload any PDF and have it automatically chunked, embedded, and stored in a FAISS vector index for fast semantic search
- **Smart Upload Routing** — Small PDFs are processed synchronously for an instant response. Large PDFs are indexed in the background so you can keep working while they process
- **Live Progress Bar** — Background indexing shows a real-time percentage progress bar with chunk count as it processes
- **Browser Notifications** — Get notified when a large PDF finishes indexing even if you've switched tabs
- **Conversational Memory** — Ask follow-up questions naturally. The last 20 exchanges are remembered per session so the LLM understands context like "tell me more about that"
- **Per-PDF Chat History** — Each PDF maintains its own independent conversation. Switch between PDFs and each one remembers its own session
- **Session Persistence** — Chat history survives page reloads by being restored from the backend on mount. Session IDs are stored in localStorage (just tiny strings, not the full history)
- **Cached Indexing** — Re-uploading the same PDF is instant since the FAISS index is saved to disk and reused
- **Markdown Rendering** — Answers are rendered as formatted markdown with bullet lists, bold text, headings, and code blocks
- **Multi-PDF Support** — Upload and manage multiple PDFs at once, switching between them freely
- **Rate Limit Handling** — Automatic exponential backoff retry on Gemini API rate limits with dynamic wait times based on token usage
- **Session Management** — Clear individual PDF conversations without affecting others

---

## Tech Stack

**Backend**
- FastAPI — API framework
- LangChain — RAG chain and conversational memory
- FAISS — Vector store for semantic search
- Google Gemini (`gemini-2.5-flash` + `gemini-embedding-001`) — LLM and embeddings
- Pydantic Settings — Type-safe environment configuration

**Frontend**
- React + Vite
- Tailwind CSS
- react-markdown + @tailwindcss/typography

---

## Project Structure

```
rag-pdf-project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS middleware
│   │   ├── config.py            # Settings, LLM, embeddings init
│   │   ├── routers/
│   │   │   └── pdf.py           # All HTTP endpoints
│   │   ├── services/
│   │   │   ├── pdf_service.py   # Upload, chunking, indexing logic
│   │   │   ├── qa_service.py    # RAG chain, conversational QA
│   │   │   ├── session_store.py # Per-session chat memory
│   │   │   └── task_store.py    # Background job progress tracking
│   │   ├── schemas/
│   │   │   └── pdf.py           # Pydantic request/response models
│   │   └── utils/
│   │       └── helpers.py       # Index path, existence checks
│   ├── indexes/                 # FAISS indexes saved here (gitignored)
│   ├── run.py                   # Uvicorn entry point
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── PDFQAApp.jsx
    │   │   ├── ChatHistory.jsx
    │   │   ├── FileUploadZone.jsx
    │   │   ├── QuestionInput.jsx
    │   │   ├── ProgressBar.jsx
    │   │   └── Badge.jsx
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

---

## Backend Setup

### Prerequisites
- Python 3.11+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=your-gemini-api-key
EMBEDDING_MODEL=gemini-embedding-001
LLM_MODEL=gemini-2.5-flash
CHUNK_SIZE=1500
CHUNK_OVERLAP=150
RETRIEVER_K=4
STORAGE_DIR=indexes
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:5173
```

> **Note:** Do not wrap values in quotes on Windows — pydantic-settings will include the quotes as part of the value.

### Run

```bash
python run.py
```

API is live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

## Frontend Setup

### Prerequisites
- Node.js 18+

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE=http://localhost:8000/api/v1/pdf
```

### Install Additional Dependencies

```bash
npm install react-markdown
npm install -D @tailwindcss/typography
```

Add the typography plugin to `tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/typography")],
}
```

### Run

```bash
npm run dev
```

Frontend is live at `http://localhost:5173`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/pdf/upload` | Upload a PDF for indexing |
| `GET` | `/api/v1/pdf/upload-status/{task_id}` | Poll background indexing progress |
| `GET` | `/api/v1/pdf/history/{session_id}` | Fetch chat history for a session |
| `POST` | `/api/v1/pdf/ask` | Ask questions about an uploaded PDF |
| `POST` | `/api/v1/pdf/clear-session` | Clear conversation memory for a session |

---

## Gemini API Free Tier Limits

The free tier of `gemini-embedding-001` has strict rate limits. Docusense handles this automatically:

- PDFs under ~10,000 characters are embedded synchronously in one request
- Larger PDFs are processed in small batches with dynamic wait times between batches
- Automatic retry with exponential backoff (60s → 120s → 240s) on rate limit errors
- Short and duplicate chunks are filtered out before embedding to reduce request count

If you hit rate limits frequently, consider upgrading to a paid Gemini API tier which increases the token-per-minute limit significantly.

---

## Gitignore

Make sure your `.gitignore` includes:

```
backend/venv/
backend/.env
backend/indexes/
backend/__pycache__/
backend/**/__pycache__/
backend/**/*.pyc
```