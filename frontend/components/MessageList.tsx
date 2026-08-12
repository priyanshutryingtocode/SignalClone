"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { Conversation, Message } from "@/lib/types";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const nameFor = (senderId: string) =>
    conversation.participants.find((p) => p.user.id === senderId)?.user.display_name;

  let lastDate = "";

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages.length === 0 && (
        <p className="mt-8 text-center text-sm text-signal-subtext">
          No messages yet. Say hello 👋
        </p>
      )}
      {messages.map((m) => {
        const label = dateLabel(m.created_at);
        const showDate = label !== lastDate;
        lastDate = label;
        return (
          <div key={m.id}>
            {showDate && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-signal-panelAlt px-3 py-1 text-xs text-signal-subtext">{label}</span>
              </div>
            )}
            <MessageBubble
              message={m}
              isOwn={m.sender_id === currentUserId}
              senderName={conversation.type === "group" ? nameFor(m.sender_id) : undefined}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
