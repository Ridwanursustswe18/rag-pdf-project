import { useState, useRef, useEffect } from "react";
import Badge from "./Badge";
import FileUploadZone from "./FileUploadZone";
import QuestionInput from "./QuestionInput";
import ChatHistory from "./ChatHistory";
import ProgressBar from "./ProgressBar";

const API_BASE = import.meta.env.VITE_API_BASE;
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const POLL_INTERVAL = 5000;
const STORAGE_KEY = "docusense_sessions";

const loadSessionMap = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const fetchWithTimeout = async (url, ms = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    return clearTimeout(timer);
  }
};

const saveSessionMap = (pdfs) => {
  try {
    const map = {};
    pdfs.forEach(p => {
      if (p.status === "done" || p.status === "processing") {
        map[p.filename] = {
          sessionId: p.sessionId,
          status: p.status,
          taskId: p.taskId || null,
        };
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
};

const PDFQAApp = () => {
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(() => Object.keys(loadSessionMap()).length > 0);
  const pollingRefs = useRef({});

  const getSelectedPdfData = () => pdfs.find(p => p.filename === selectedPdf) || null;
  const updatePdf = (filename, updates) =>
    setPdfs(prev => prev.map(p => p.filename === filename ? { ...p, ...updates } : p));

  const startPolling = (taskId, filename) => {
    if (pollingRefs.current[taskId]) return; 
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/upload-status/${taskId}`);
        const data = await res.json();

        updatePdf(filename, {
          progress: data.progress,
          completedChunks: data.completed_chunks,
          totalChunks: data.total_chunks,
          progressMessage: data.message,
        });

        if (data.status === "done") {
          clearInterval(pollingRefs.current[taskId]);
          delete pollingRefs.current[taskId];
          updatePdf(filename, { status: "done", progress: 100 });
          if (Notification.permission === "granted") {
            new Notification("PDF Ready ✅", { body: `${filename} is ready to use.` });
          }
        }

        if (data.status === "failed") {
          clearInterval(pollingRefs.current[taskId]);
          delete pollingRefs.current[taskId];
          updatePdf(filename, { status: "failed", error: data.error });
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, POLL_INTERVAL);
    pollingRefs.current[taskId] = intervalId;
  };

  useEffect(() => {
    const restore = async () => {
      const sessionMap = loadSessionMap();
      const filenames = Object.keys(sessionMap);

      if (!filenames.length) {
        setRestoring(false);
        return;
      }

      const restored = await Promise.all(
        filenames.map(async (filename) => {
          const { sessionId, status, taskId } = sessionMap[filename];

          const base = {
            filename,
            sessionId,
            taskId: taskId || null,
            history: [],
            sessionExpired: false,
            progress: 0,
            completedChunks: 0,
            totalChunks: null,
            progressMessage: "",
          };

          if (status === "processing" && taskId) {
            try {
              const res = await fetchWithTimeout(`${API_BASE}/upload-status/${taskId}`);
              const data = await res.json();

              if (data.status === "done") {
                return { ...base, status: "done", progress: 100 };
              }
              if (data.status === "failed") {
                return { ...base, status: "failed", error: data.error };
              }
              return {
                ...base,
                status: "processing",
                progress: data.progress,
                completedChunks: data.completed_chunks,
                totalChunks: data.total_chunks,
                progressMessage: data.message,
              };
            } catch {
              return { ...base, status: "failed", error: "Could not reconnect to indexing task." };
            }
          }

          try {
            const res = await fetchWithTimeout(`${API_BASE}/history/${sessionId}`);
            const data = await res.json();
            return {
              ...base,
              status: "done",
              history: data.history || [],
              sessionExpired: !data.exists,
            };
          } catch {
            return { ...base, status: "done" };
          }
        })
      );

      setPdfs(restored);

      restored.forEach(p => {
        if (p.status === "processing" && p.taskId) {
          startPolling(p.taskId, p.filename);
        }
      });

      setRestoring(false);
    };

    restore();
    if (Notification.permission === "default") Notification.requestPermission();
    return () => Object.values(pollingRefs.current).forEach(clearInterval);
  }, []);

  useEffect(() => {
    if (!restoring) saveSessionMap(pdfs);
  }, [pdfs, restoring]);

  useEffect(() => {
    setQuestion("");
    setError(null);
  }, [selectedPdf]);

  // ── Upload ─────────────────────────────────────────────────
  const handleUpload = async (file) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();

      const alreadyExists = pdfs.find(p => p.filename === data.pdf_filename);
      if (alreadyExists) {
        setSelectedPdf(data.pdf_filename);
        return;
      }

      const newPdf = {
        filename: data.pdf_filename,
        status: data.status === "processing" ? "processing" : "done",
        taskId: data.task_id || null,
        sessionId: generateSessionId(),
        history: [],
        sessionExpired: false,
        progress: 0,
        completedChunks: 0,
        totalChunks: data.num_chunks || null,
        progressMessage: "Starting indexing...",
      };

      setPdfs(prev => [...prev, newPdf]);

      if (data.status === "processing") {
        startPolling(data.task_id, data.pdf_filename);
      } else {
        setSelectedPdf(data.pdf_filename);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Ask ────────────────────────────────────────────────────
  const handleAsk = async () => {
    if (!question.trim() || !selectedPdf) return;
    const pdfData = getSelectedPdfData();
    if (!pdfData) return;
    setAsking(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_filename: selectedPdf,
          session_id: pdfData.sessionId,
          questions: [question.trim()],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }
      const data = await res.json();
      updatePdf(selectedPdf, { history: data.history, sessionExpired: false });
      setQuestion("");
    } catch (e) {
      setError(e.message);
    } finally {
      setAsking(false);
    }
  };

  const handleClearSession = async () => {
    const pdfData = getSelectedPdfData();
    if (!pdfData) return;
    try {
      await fetch(`${API_BASE}/clear-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: pdfData.sessionId }),
      });
      updatePdf(selectedPdf, { sessionId: generateSessionId(), history: [], sessionExpired: false });
    } catch (e) {
      setError("Failed to clear session");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canAsk) handleAsk();
    }
  };

  const pdfData = getSelectedPdfData();
  const canAsk = selectedPdf && question.trim() && !asking && !uploading;

  if (restoring) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Restoring your sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl flex flex-col gap-8">

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <h1 className="text-2xl font-bold tracking-tight">AskMyPDF</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-9">Upload PDFs and ask anything about them.</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Upload</p>
          <FileUploadZone onUpload={handleUpload} uploading={uploading} uploadedFile={null} />
        </div>

        {pdfs.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Your PDFs</p>
            <div className="flex flex-col gap-2">
              {pdfs.map((pdf) => (
                <div
                  key={pdf.filename}
                  onClick={() => pdf.status === "done" && setSelectedPdf(pdf.filename)}
                  className={`
                    flex flex-col gap-3 px-4 py-3 rounded-xl border text-sm transition-all duration-200
                    ${selectedPdf === pdf.filename
                      ? "border-indigo-500 bg-indigo-950/40"
                      : pdf.status === "done"
                      ? "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500 cursor-pointer"
                      : pdf.status === "failed"
                      ? "border-red-800/50 bg-red-950/20"
                      : "border-zinc-700/50 bg-zinc-900/20"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{pdf.status === "failed" ? "❌" : pdf.status === "done" ? "📄" : "⏳"}</span>
                      <div className="flex flex-col">
                        <span className={`font-medium truncate max-w-xs ${
                          pdf.status === "done" ? "text-zinc-200" :
                          pdf.status === "failed" ? "text-red-400" : "text-zinc-500"
                        }`}>{pdf.filename}</span>
                        {pdf.status === "done" && pdf.history.length > 0 && (
                          <span className="text-xs text-zinc-600">
                            {pdf.history.length} message{pdf.history.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {pdf.sessionExpired && (
                          <span className="text-xs text-amber-500">Session expired — history cleared</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {pdf.status === "done" && selectedPdf === pdf.filename && <Badge variant="success">selected</Badge>}
                      {pdf.status === "failed" && <Badge variant="error">failed</Badge>}
                    </div>
                  </div>
                  {pdf.status === "processing" && (
                    <ProgressBar
                      progress={pdf.progress}
                      message={pdf.progressMessage}
                      completedChunks={pdf.completedChunks}
                      totalChunks={pdf.totalChunks}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPdf && pdfData && (
          <>
            <ChatHistory history={pdfData.history} onClear={handleClearSession} />
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                {pdfData.history.length > 0 ? "Follow-up Question" : "Question"}
              </p>
              <QuestionInput question={question} onChange={setQuestion} onKeyDown={handleKeyDown} disabled={asking} />
            </div>
            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            <button onClick={handleAsk} disabled={!canAsk}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
                ${canAsk
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 active:scale-[0.98]"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}>
              {asking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Thinking…
                </span>
              ) : "Ask"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PDFQAApp;