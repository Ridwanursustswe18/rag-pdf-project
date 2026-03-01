import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const ChatHistory = ({ history, onClear }) => {
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  if (!history.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Conversation</p>
        <button onClick={onClear} className="text-xs text-zinc-600 hover:text-red-400 transition-colors font-medium">
          Clear session
        </button>
      </div>

      <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
        {history.map((item, i) => (
          <div key={i} className="flex flex-col gap-2">

            {/* Question bubble */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-indigo-600/20 border border-indigo-700/40 rounded-2xl rounded-tr-sm px-4 py-2.5">
                <p className="text-zinc-200 text-sm leading-relaxed">{item.question}</p>
              </div>
            </div>

            {/* Answer bubble — rendered as markdown */}
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-zinc-800/60 border border-zinc-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="prose prose-sm prose-invert max-w-none
                  prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:my-1
                  prose-ul:text-zinc-300 prose-ul:my-1 prose-ul:pl-4
                  prose-ol:text-zinc-300 prose-ol:my-1 prose-ol:pl-4
                  prose-li:my-0.5 prose-li:leading-relaxed
                  prose-strong:text-zinc-100 prose-strong:font-semibold
                  prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:my-2
                  prose-code:text-indigo-300 prose-code:bg-zinc-900 prose-code:px-1 prose-code:rounded
                  prose-blockquote:border-indigo-500 prose-blockquote:text-zinc-400
                ">
                  <ReactMarkdown>{item.answer}</ReactMarkdown>
                </div>
              </div>
            </div>

          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ChatHistory;