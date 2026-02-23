const Results = ({ results }) => {
  if (!results.length) return null;
  return (
    <div className="flex flex-col gap-3 mt-2">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
        Answers
      </p>
      {results.map((r, i) => (
        <div
          key={i}
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3"
        >
          <div className="flex items-start gap-2">
            <p className="text-zinc-300 text-sm font-medium leading-relaxed">{r.question}</p>
          </div>
          <div className="flex items-start gap-2 pl-5 border-l-2 border-indigo-800/60">
            <p className="text-zinc-400 text-sm leading-relaxed">{r.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
export default Results;