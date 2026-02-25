const QuestionInput = ({ question, onChange, onKeyDown, disabled }) => {
  return (
    <textarea
      rows={3}
      placeholder={disabled ? "Upload a PDF first…" : "Ask anything about your PDF… (Enter to send)"}
      value={question}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    />
  );
};

export default QuestionInput;