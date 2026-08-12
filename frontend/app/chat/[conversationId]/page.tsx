"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
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

  const conversation = conversations.find((c) => c.id === conversationId);
  const messages = messagesByConversation[conversationId] ?? [];

  useEffect(() => {
    setActiveConversation(conversationId);
  }, [conversationId, setActiveConversation]);

  // Mark the latest message from someone else as read once loaded/visible.
  useEffect(() => {
    if (!currentUser || messages.length === 0) return;
    const lastFromOther = [...messages].reverse().find((m) => m.sender_id !== currentUser.id);
    if (lastFromOther && lastFromOther.status !== "read") {
      markRead(lastFromOther.id);
    }
  }, [messages, currentUser, markRead]);

  if (!conversation || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center text-signal-subtext">
        Conversation not found.
      </div>
    );
  }

  const isGroup = conversation.type === "group";
  const other = !isGroup ? conversation.participants.find((p) => p.user.id !== currentUser.id) : null;
  const title = isGroup ? conversation.name ?? "Group" : other?.user.display_name ?? "Unknown";
  const isOnline = other ? onlineUsers.has(other.user.id) : false;

  const typingUserIds = Array.from(typingByConversation[conversationId] ?? []);
  const typingNames = typingUserIds
    .map((id) => conversation.participants.find((p) => p.user.id === id)?.user.display_name)
    .filter(Boolean);

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-signal-border bg-signal-panel px-4 py-3">
        <button
          onClick={() => (isGroup ? setShowMembers(true) : undefined)}
          className="flex items-center gap-3 text-left"
        >
          <Avatar id={conversation.id} name={title} size={40} online={!isGroup ? isOnline : undefined} />
          <div>
            <p className="text-sm font-semibold text-signal-text">{title}</p>
            <p className="text-xs text-signal-subtext">
              {isGroup
                ? `${conversation.participants.length} members`
                : isOnline
                ? "Online"
                : `Last seen ${other ? new Date(other.user.last_seen_at).toLocaleString() : ""}`}
            </p>
          </div>
        </button>
        <button onClick={() => router.push("/chat")} className="text-signal-subtext hover:text-signal-text">
          ✕
        </button>
      </div>

      <MessageList messages={messages} currentUserId={currentUser.id} conversation={conversation} />

      {typingNames.length > 0 && (
        <div className="px-4 pb-1 text-xs text-signal-subtext">
          {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing
          <span className="typing-dot ml-1 inline-block">•</span>
          <span className="typing-dot ml-0.5 inline-block" style={{ animationDelay: "0.2s" }}>
            •
          </span>
          <span className="typing-dot ml-0.5 inline-block" style={{ animationDelay: "0.4s" }}>
            •
          </span>
        </div>
      )}

      <MessageInput conversationId={conversationId} />

      {showMembers && isGroup && <GroupMembersModal conversation={conversation} onClose={() => setShowMembers(false)} />}
    </div>
  );
}
