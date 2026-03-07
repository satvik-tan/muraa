type Props = {
  status: string;
  isRecording: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export function InterviewControls({
  status,
  isRecording,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p>Status: <strong>{status}</strong></p>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button onClick={onConnect} disabled={status !== "idle"}>
          Connect
        </button>
        <button onClick={onStartRecording} disabled={isRecording || status !== "connected"}>
          Start Recording
        </button>
        <button onClick={onStopRecording} disabled={!isRecording}>
          Stop Recording
        </button>
        <button onClick={onDisconnect} disabled={status === "idle"}>
          Disconnect
        </button>
      </div>
    </div>
  );
}