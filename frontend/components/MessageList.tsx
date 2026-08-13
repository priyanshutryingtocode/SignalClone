"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { Conversation, Message } from "@/lib/types";

function dateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export default function MessageList({
  messages,
  currentUserId,
  conversation,
}: {
  messages: Message[];
  currentUserId: string;
  conversation: Conversation;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);
  const previousConversationRef = useRef(conversation.id);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updatePosition = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      wasNearBottomRef.current = distanceFromBottom < 120;
    };

    updatePosition();
    container.addEventListener("scroll", updatePosition, { passive: true });
    return () => container.removeEventListener("scroll", updatePosition);
  }, [conversation.id]);

  useEffect(() => {
    const conversationChanged = previousConversationRef.current !== conversation.id;
    previousConversationRef.current = conversation.id;

    if (conversationChanged || wasNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({
        behavior: conversationChanged ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [conversation.id, messages.length]);

  const nameFor = (senderId: string) =>
    conversation.participants.find((p) => p.user.id === senderId)?.user.display_name;

  let lastDate = "";

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto bg-signal-bg px-4 py-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-20 text-sm text-signal-subtext">
            No messages yet. Say hello.
          </div>
        )}

        {messages.map((message, index) => {
          const label = dateLabel(message.created_at);
          const showDate = label !== lastDate;
          lastDate = label;

          const previous = messages[index - 1];
          const next = messages[index + 1];
          const isFirstInGroup =
            !previous ||
            previous.sender_id !== message.sender_id ||
            previous.content_type === "system";
          const isLastInGroup =
            !next ||
            next.sender_id !== message.sender_id ||
            next.content_type === "system";

          return (
            <div key={message.id}>
              {showDate && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-signal-panel px-3 py-1 text-[11px] font-medium text-signal-subtext">
                    {label}
                  </span>
                </div>
              )}

              <MessageBubble
                message={message}
                isOwn={message.sender_id === currentUserId}
                senderName={
                  conversation.type === "group"
                    ? nameFor(message.sender_id)
                    : undefined
                }
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
              />
            </div>
          );
        })}
        <div ref={bottomRef} className="h-px" />
      </div>
    </div>
  );
}
