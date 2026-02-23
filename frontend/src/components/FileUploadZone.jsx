import { useCallback, useRef, useState } from "react";

const FileUploadZone = ({ onUpload, uploading, uploadedFile }) =>{
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = useCallback(
    async (file) => {
      if (!file || !file.name.endsWith(".pdf")) {
        alert("Please upload a PDF file.");
        return;
      }
      onUpload(file);
    },
    [onUpload]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      onClick={() => !uploading && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`
        relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
        transition-all duration-300 select-none
        ${dragging
          ? "border-indigo-400 bg-indigo-950/40 scale-[1.01]"
          : uploadedFile
          ? "border-emerald-600/60 bg-emerald-950/20"
          : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-800/40"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">Processing PDF…</p>
        </div>
      ) : uploadedFile ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center text-2xl">
            📄
          </div>
          <p className="text-emerald-300 font-semibold text-sm">{uploadedFile}</p>
          <p className="text-zinc-500 text-xs">Click to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl">
            📂
          </div>
          <div>
            <p className="text-zinc-200 font-semibold text-sm">Drop your PDF here</p>
            <p className="text-zinc-500 text-xs mt-1">or click to browse</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default FileUploadZone;