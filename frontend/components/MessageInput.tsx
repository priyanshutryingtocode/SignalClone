"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import Icon from "./Icon";

export default function MessageInput({ conversationId }: { conversationId: string }) {
  const [value, setValue] = useState("");
  const sendMessage = useStore((s) => s.sendMessage);
  const sendTyping = useStore((s) => s.sendTyping);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (isTypingRef.current) sendTyping(conversationId, false);
    };
  }, [conversationId, sendTyping]);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  function handleChange(nextValue: string) {
    setValue(nextValue);
    requestAnimationFrame(resizeTextarea);

    if (nextValue.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        sendTyping(conversationId, true);
      }

      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        isTypingRef.current = false;
        sendTyping(conversationId, false);
      }, 1500);
    } else if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }
  }

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    setValue("");
    requestAnimationFrame(resizeTextarea);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    isTypingRef.current = false;
    sendTyping(conversationId, false);

    setSending(true);
    try {
      await sendMessage(conversationId, trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div className="shrink-0 border-t border-signal-border/70 bg-signal-panel px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-end gap-2">
        <button
          type="button"
          aria-label="Attach file"
          title="Attach file"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-panelAlt hover:text-signal-text"
        >
          <Icon name="paperclip" size={19} />
        </button>

        <div className="flex min-h-10 flex-1 items-end rounded-[20px] border border-signal-border bg-signal-panelAlt px-3 py-1.5 transition-colors focus-within:border-signal-borderLight">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type a message"
            aria-label="Message"
            className="max-h-[120px] min-h-7 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1 text-sm leading-5 text-signal-text outline-none placeholder:text-signal-subtext"
          />
          <button
            type="button"
            aria-label="Emoji"
            title="Emoji"
            className="mb-0.5 ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-bg hover:text-signal-text"
          >
            <Icon name="smile" size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!value.trim() || sending}
          aria-label="Send message"
          title="Send message"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-accent text-white transition-colors hover:bg-signal-accentHover disabled:cursor-default disabled:bg-signal-panelAlt disabled:text-signal-subtext"
        >
          {sending ? <Icon name="loader" size={18} /> : <Icon name="send" size={18} />}
        </button>
      </div>
    </div>
  );
}
