type StatusBadgeProps = { status: string };

function StatusBadge({ status }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    idle: "bg-muted text-muted-foreground",
    connected: "bg-green-500/15 text-green-700 dark:text-green-400",
    disconnected: "bg-muted text-muted-foreground",
    error: "bg-destructive/15 text-destructive",
  };
  const dotMap: Record<string, string> = {
    idle: "bg-muted-foreground/40",
    connected: "bg-green-500 animate-pulse",
    disconnected: "bg-muted-foreground/40",
    error: "bg-destructive",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-semibold ${colorMap[status] ?? colorMap.idle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotMap[status] ?? dotMap.idle}`} />
      {label}
    </span>
  );
}

type Props = {
  status: string;
  isRecording: boolean;
  disabled?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export function InterviewControls({
  status,
  isRecording,
  disabled = false,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-body text-muted-foreground">Status</span>
        <StatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onConnect}
            disabled={disabled || status !== "idle"}
            className="flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-body font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Connect
          </button>
          <button
            onClick={onDisconnect}
            disabled={disabled || status === "idle"}
            className="flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-body font-semibold border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Disconnect
          </button>
        </div>

        <button
          onClick={onStartRecording}
          disabled={disabled || isRecording || status !== "connected"}
          className="flex items-center justify-center gap-2 w-full rounded-full py-2.5 px-4 text-sm font-body font-semibold bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Recording…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Start Speaking
            </>
          )}
        </button>

        <button
          onClick={onStopRecording}
          disabled={disabled || !isRecording}
          className="flex items-center justify-center gap-2 w-full rounded-full py-2.5 px-4 text-sm font-body font-semibold border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Stop Speaking
        </button>
      </div>
    </div>
  );
}