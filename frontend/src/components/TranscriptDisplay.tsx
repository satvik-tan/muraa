type Props = {
  transcript: string;
};

export function TranscriptDisplay({ transcript }: Props) {
  return (
    <div style={{ marginTop: "1rem" }}>
      <h3>Transcript:</h3>
      <p style={{
        whiteSpace: "pre-wrap",
        background: "#f0f0f0",
        padding: "1rem",
        minHeight: "100px"
      }}>
        {transcript || "Nova's responses will appear here..."}
      </p>
    </div>
  );
}