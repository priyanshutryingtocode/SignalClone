"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Icon from "@/components/Icon";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import GroupMembersModal from "@/components/GroupMembersModal";
import { useStore } from "@/lib/store";

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const router = useRouter();

  const conversations = useStore((s) => s.conversations);
  const currentUser = useStore((s) => s.currentUser);
  const messagesByConversation = useStore((s) => s.messagesByConversation);
  const setActiveConversation = useStore((s) => s.setActiveConversation);
  const typingByConversation = useStore((s) => s.typingByConversation);
  const onlineUsers = useStore((s) => s.onlineUsers);
  const markRead = useStore((s) => s.markRead);

  const [showMembers, setShowMembers] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastMarkedRef = useRef<string | null>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const messages = messagesByConversation[conversationId] ?? [];

  useEffect(() => {
    lastMarkedRef.current = null;
    void setActiveConversation(conversationId);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    if (!currentUser || messages.length === 0) return;

    const latestIncoming = [...messages]
      .reverse()
      .find((message) => message.sender_id !== currentUser.id);

    if (!latestIncoming || lastMarkedRef.current === latestIncoming.id) return;
    lastMarkedRef.current = latestIncoming.id;
    void markRead(latestIncoming.id);
  }, [messages, currentUser, markRead]);

  if (!conversation || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-signal-subtext">
        Conversation not found.
      </div>
    );
  }

  const isGroup = conversation.type === "group";
  const other = !isGroup
    ? conversation.participants.find((p) => p.user.id !== currentUser.id)
    : null;
  const title = isGroup
    ? conversation.name ?? "Group"
    : other?.user.display_name ?? "Unknown";
  const isOnline = other ? onlineUsers.has(other.user.id) : false;

  const typingNames = Array.from(typingByConversation[conversationId] ?? [])
    .map((id) => conversation.participants.find((p) => p.user.id === id)?.user.display_name)
    .filter((name): name is string => Boolean(name));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-signal-bg">
      <header className="flex h-[62px] shrink-0 items-center border-b border-signal-border/70 bg-signal-panel px-3 sm:px-4">
        <button
          type="button"
          onClick={() => router.push("/chat")}
          aria-label="Back to conversations"
          className="mr-1 flex h-9 w-9 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-panelAlt hover:text-signal-text sm:hidden"
        >
          <Icon name="arrow-left" size={20} />
        </button>

        <Avatar
          id={conversation.id}
          name={title}
          size={38}
          online={isGroup ? undefined : isOnline}
        />

        <div className="ml-3 min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-signal-text">{title}</p>
          <p className="truncate text-xs text-signal-subtext">
            {typingNames.length > 0
              ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
              : isGroup
                ? `${conversation.participants.length} members`
                : isOnline
                  ? "Online"
                  : "Offline"}
          </p>
        </div>

        <div className="relative flex items-center gap-0.5">
          {!isGroup && (
            <>
              <button
                type="button"
                aria-label="Start voice call"
                title="Voice call"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-panelAlt hover:text-signal-text sm:flex"
              >
                <Icon name="phone" size={19} />
              </button>
              <button
                type="button"
                aria-label="Start video call"
                title="Video call"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-panelAlt hover:text-signal-text sm:flex"
              >
                <Icon name="video" size={19} />
              </button>
            </>
          )}

          <button
            type="button"
            aria-label="Conversation menu"
            title="Conversation menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-panelAlt hover:text-signal-text"
          >
            <Icon name="more" size={20} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-signal-border bg-signal-panelAlt py-1 shadow-xl">
              {isGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowMembers(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-signal-text hover:bg-signal-bg"
                >
                  <Icon name="users" size={17} />
                  Group members
                </button>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-signal-text hover:bg-signal-bg"
              >
                Search conversation
              </button>
            </div>
          )}
        </div>
      </header>

      <MessageList
        messages={messages}
        currentUserId={currentUser.id}
        conversation={conversation}
      />

      {typingNames.length > 0 && (
        <div className="shrink-0 px-5 pb-1 text-xs text-signal-subtext">
          {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing
          <span className="ml-1 inline-flex gap-0.5 align-middle">
            <span className="typing-dot">•</span>
            <span className="typing-dot" style={{ animationDelay: "0.2s" }}>•</span>
            <span className="typing-dot" style={{ animationDelay: "0.4s" }}>•</span>
          </span>
        </div>
      )}

      <MessageInput conversationId={conversationId} />

      {showMembers && isGroup && (
        <GroupMembersModal
          conversation={conversation}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
