const QuestionInput = ({ question, onChange }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
          <textarea
            rows={3}
            placeholder="Ask anything about your PDF…"
            value={question || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
          />
      </div>
    </div>
  );
}
export default QuestionInput;