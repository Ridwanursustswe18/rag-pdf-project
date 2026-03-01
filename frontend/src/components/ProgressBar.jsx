const ProgressBar = ({ progress, message, completedChunks, totalChunks }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Labels */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 truncate max-w-[70%]">{message}</p>
        <div className="flex items-center gap-2 shrink-0">
          
          <span className="text-xs font-semibold text-indigo-400">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;