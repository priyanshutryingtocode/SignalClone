export default function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-signal-subtext">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-signal-panel text-3xl">💬</div>
      <p className="text-sm">Select a conversation or start a new one</p>
    </div>
  );
}
