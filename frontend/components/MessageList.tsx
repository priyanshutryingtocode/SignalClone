"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { Conversation, Message } from "@/lib/types";

/*
 * Convert a backend timestamp into a Date.
 *
 * Backend timestamps are UTC.
 * If there is no timezone information, explicitly
 * append Z so JavaScript treats it as UTC.
 */
function parseUTCDate(iso: string): Date {
  const hasTimezone =
    iso.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(iso);

  return new Date(
    hasTimezone ? iso : `${iso}Z`
  );
}

/*
 * Get the calendar date in IST.
 *
 * This is important because the date separator should
 * also use Asia/Kolkata rather than the browser timezone.
 */
function getIndiaDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateLabel(iso: string): string {
  const date = parseUTCDate(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const dateKey = getIndiaDateKey(date);
  const todayKey = getIndiaDateKey(now);

  /*
   * Calculate yesterday based on the IST calendar date.
   */
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayKey = getIndiaDateKey(yesterday);

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === yesterdayKey) {
    return "Yesterday";
  }

  /*
   * Format the actual message date in IST.
   */
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

    if (!container) {
      return;
    }

    const updatePosition = () => {
      const distanceFromBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      wasNearBottomRef.current =
        distanceFromBottom < 120;
    };

    updatePosition();

    container.addEventListener(
      "scroll",
      updatePosition,
      { passive: true }
    );

    return () => {
      container.removeEventListener(
        "scroll",
        updatePosition
      );
    };
  }, [conversation.id]);

  useEffect(() => {
    const conversationChanged =
      previousConversationRef.current !==
      conversation.id;

    previousConversationRef.current =
      conversation.id;

    if (
      conversationChanged ||
      wasNearBottomRef.current
    ) {
      bottomRef.current?.scrollIntoView({
        behavior: conversationChanged
          ? "auto"
          : "smooth",
        block: "end",
      });
    }
  }, [conversation.id, messages.length]);

  const nameFor = (senderId: string) =>
    conversation.participants.find(
      (p) => p.user.id === senderId
    )?.user.display_name;

  let lastDate = "";

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 overflow-y-auto bg-signal-bg px-4 py-4"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-20 text-sm text-signal-subtext">
            No messages yet. Say hello.
          </div>
        )}

        {messages.map((message, index) => {
          const label = dateLabel(
            message.created_at
          );

          const showDate =
            label !== lastDate;

          lastDate = label;

          const previous =
            messages[index - 1];

          const next =
            messages[index + 1];

          const isFirstInGroup =
            !previous ||
            previous.sender_id !==
              message.sender_id ||
            previous.content_type ===
              "system";

          const isLastInGroup =
            !next ||
            next.sender_id !==
              message.sender_id ||
            next.content_type ===
              "system";

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
                isOwn={
                  message.sender_id ===
                  currentUserId
                }
                senderName={
                  conversation.type === "group"
                    ? nameFor(
                        message.sender_id
                      )
                    : undefined
                }
                isFirstInGroup={
                  isFirstInGroup
                }
                isLastInGroup={
                  isLastInGroup
                }
              />
            </div>
          );
        })}

        <div
          ref={bottomRef}
          className="h-px"
        />
      </div>
    </div>
  );
}