import { Message } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusTicks({ status }: { status: Message["status"] }) {
  if (status === "sending") return <span className="text-[11px] text-white/60">🕐</span>;
  if (status === "sent") return <span className="text-[11px] text-white/60">✓</span>;
  if (status === "delivered") return <span className="text-[11px] text-white/60">✓✓</span>;
  return <span className="text-[11px] text-sky-300">✓✓</span>; // read
}

export default function MessageBubble({ message, isOwn, senderName }: { message: Message; isOwn: boolean; senderName?: string }) {
  if (message.content_type === "system") {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-signal-panelAlt px-3 py-1 text-xs text-signal-subtext">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-4 py-0.5`}>
      <div
        className={`max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${
          isOwn ? "rounded-br-sm bg-signal-bubbleOut text-white" : "rounded-bl-sm bg-signal-bubbleIn text-signal-text"
        }`}
      >
        {!isOwn && senderName && <p className="mb-0.5 text-xs font-medium text-signal-accent">{senderName}</p>}
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        <div className={`mt-1 flex items-center justify-end gap-1 ${isOwn ? "" : "text-signal-subtext"}`}>
          <span className={`text-[11px] ${isOwn ? "text-white/60" : "text-signal-subtext"}`}>
            {formatTime(message.created_at)}
          </span>
          {isOwn && <StatusTicks status={message.status} />}
        </div>
      </div>
    </div>
  );
}
