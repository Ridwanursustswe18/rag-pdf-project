import { useEffect, useRef } from "react";

const ChatHistory = ({ history, onClear }) => {
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  if (!history.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Conversation
        </p>
        <button
          onClick={onClear}
          className="text-xs text-zinc-600 hover:text-red-400 transition-colors font-medium"
        >
          Clear session
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
        {history.map((item, i) => (
          <div key={i} className="flex flex-col gap-2">

            {/* Question bubble */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-indigo-600/20 border border-indigo-700/40 rounded-2xl rounded-tr-sm px-4 py-2.5">
                <p className="text-zinc-200 text-sm leading-relaxed">{item.question}</p>
              </div>
            </div>

            {/* Answer bubble */}
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-zinc-800/60 border border-zinc-700/50 rounded-2xl rounded-tl-sm px-4 py-2.5">
                <p className="text-zinc-300 text-sm leading-relaxed">{item.answer}</p>
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