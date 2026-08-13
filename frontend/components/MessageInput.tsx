"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";

export default function MessageInput({ conversationId }: { conversationId: string }) {
  const [value, setValue] = useState("");
  const sendMessage = useStore((s) => s.sendMessage);
  const sendTyping = useStore((s) => s.sendTyping);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  function handleChange(v: string) {
    setValue(v);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(conversationId, true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }, 1500);
  }

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");
    isTypingRef.current = false;
    sendTyping(conversationId, false);
    await sendMessage(conversationId, trimmed);
  }

  return (
    <div className="flex items-end gap-2 border-t border-signal-border bg-signal-panel px-4 py-3">
      <textarea
        rows={1}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type a message"
        className="max-h-32 flex-1 resize-none rounded-xl border border-signal-border bg-signal-panelAlt px-3 py-2 text-sm text-signal-text outline-none focus-visible:ring-2 focus-visible:ring-signal-accent/40 focus-visible:ring-offset-2"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim()}
        className="rounded-full bg-signal-accent px-4 py-2 text-sm font-medium text-white hover:bg-signal-accentHover hover:transition-colors duration-150 disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
