import Icon from "./Icon";
import { Message } from "@/lib/types";

function formatTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function StatusTicks({
  status,
}: {
  status: Message["status"];
}) {
  if (status === "sending") {
    return <Icon name="loader" size={12} />;
  }

  if (status === "sent") {
    return <Icon name="check" size={13} />;
  }

  if (status === "delivered") {
    return <Icon name="checks" size={13} />;
  }

  return <Icon name="checks" size={13} />;
}

export default function MessageBubble({
  message,
  isOwn,
  senderName,
  isFirstInGroup = true,
  isLastInGroup = true,
}: {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}) {
  if (message.content_type === "system") {
    return (
      <div className="my-3 flex justify-center text-center">
        <span className="rounded-full bg-signal-panel px-3 py-1 text-[11px] text-signal-subtext">
          {message.content}
        </span>
      </div>
    );
  }

  const own = isOwn;

  const bubbleRadius = own
    ? `${isFirstInGroup ? "rounded-t-[18px]" : "rounded-t-md"} ${
        isLastInGroup
          ? "rounded-br-[4px]"
          : "rounded-br-md"
      } rounded-bl-[18px]`
    : `${isFirstInGroup ? "rounded-t-[18px]" : "rounded-t-md"} ${
        isLastInGroup
          ? "rounded-bl-[4px]"
          : "rounded-bl-md"
      } rounded-br-[18px]`;

  return (
    <div
      className={`flex ${
        own ? "justify-end" : "justify-start"
      } ${
        isFirstInGroup
          ? "mt-2"
          : "mt-0.5"
      }`}
    >
      <div
        className={`max-w-[min(72%,520px)] px-3 py-2 text-sm leading-5 shadow-sm ${
          own
            ? "bg-signal-bubbleOut text-white"
            : "bg-signal-bubbleIn text-signal-text"
        } ${bubbleRadius}`}
      >
        {!own &&
          senderName &&
          isFirstInGroup && (
            <p className="mb-0.5 text-xs font-medium text-signal-accent">
              {senderName}
            </p>
          )}

        <div className="flex items-end gap-2">
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">
            {message.content}
          </p>

          <span
            className={`shrink-0 self-end text-[10px] leading-3 ${
              own
                ? "text-white/60"
                : "text-signal-subtext"
            }`}
          >
            {formatTime(
              message.created_at
            )}
          </span>

          {own && (
            <span
              className={`shrink-0 self-end ${
                message.status === "read"
                  ? "text-blue-200"
                  : "text-white/60"
              }`}
              aria-label={message.status}
            >
              <StatusTicks
                status={message.status}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}