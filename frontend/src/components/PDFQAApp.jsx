import { useState } from "react";
import Badge from "./Badge";
import FileUploadZone from "./FileUploadZone";
import QuestionInput from "./QuestionInput";
import Results from "./Results";

const PDFQAApp = () => {
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE;  
  const handleUpload = async (file) => {
    setUploading(true);
    setError(null);
    setResults([]);
    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      setUploadedFilename(data.pdf_filename);
      setCached(data.cached);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    const clean = question.split("\n").map((q) => q.trim()).filter((q) => q.length);
    if (!clean.length) return;
    setAsking(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_filename: uploadedFilename, questions: clean }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }

      const data = await res.json();
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setAsking(false);
    }
  };

  const canAsk = uploadedFilename && question && !asking;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl flex flex-col gap-8">

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <h1 className="text-2xl font-bold tracking-tight">PDF Q&A</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-9">
            Upload a PDF and ask anything about it.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Document
            </p>
            {uploadedFilename && (
              <Badge variant={cached ? "loading" : "success"}>
                {cached ? "cached index" : "indexed"}
              </Badge>
            )}
          </div>
          <FileUploadZone
            onUpload={handleUpload}
            uploading={uploading}
            uploadedFile={uploadedFilename}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Questions
          </p>
          <QuestionInput question={question} onChange={setQuestion} />
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleAsk}
          disabled={!canAsk}
          className={`
            w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
            ${canAsk
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 active:scale-[0.98]"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }
          `}
        >
          {asking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Thinking…
            </span>
          ) : (
            "Ask"
          )}
        </button>

        <Results results={results} />
      </div>
    </div>
  );
}
export default PDFQAApp;