
const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-zinc-800 text-zinc-300",
    success: "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50",
    error: "bg-red-900/60 text-red-300 border border-red-700/50",
    loading: "bg-indigo-900/60 text-indigo-300 border border-indigo-700/50",
  };
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {children}
    </span>
  );
}
export default Badge;