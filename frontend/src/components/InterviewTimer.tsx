type Props = {
  seconds: number;
  isRunning: boolean;
};

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function InterviewTimer({ seconds, isRunning }: Props) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-red-500 animate-pulse" : "bg-muted-foreground/40"}`} />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Interview Time
      </span>
      <span className="font-mono text-lg font-semibold text-foreground tabular-nums">
        {formatElapsed(seconds)}
      </span>
    </div>
  );
}
