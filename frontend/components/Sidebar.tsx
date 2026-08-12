"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Avatar from "./Avatar";
import NewChatModal from "./NewChatModal";
import NewGroupModal from "./NewGroupModal";
import { useStore } from "@/lib/store";
import { Conversation } from "@/lib/types";

function conversationTitle(conv: Conversation, myId: string): string {
  if (conv.type === "group") return conv.name ?? "Group";
  const other = conv.participants.find((p) => p.user.id !== myId);
  return other?.user.display_name ?? "Unknown";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const conversations = useStore((s) => s.conversations);
  const currentUser = useStore((s) => s.currentUser);
  const onlineUsers = useStore((s) => s.onlineUsers);
  const logout = useStore((s) => s.logout);

  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeId = pathname?.split("/chat/")[1];

  const filtered = useMemo(() => {
    if (!currentUser) return [];
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => conversationTitle(c, currentUser.id).toLowerCase().includes(q));
  }, [conversations, search, currentUser]);

  if (!currentUser) return null;

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-r border-signal-border bg-signal-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-signal-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar id={currentUser.id} name={currentUser.display_name} size={36} />
          <span className="font-medium text-signal-text">{currentUser.display_name}</span>
        </div>
        <div className="relative flex items-center gap-1">
          <button
            title="New group"
            onClick={() => setShowNewGroup(true)}
            className="rounded-full p-2 text-signal-subtext hover:bg-signal-panelAlt hover:text-signal-text"
          >
            👥
          </button>
          <button
            title="New chat"
            onClick={() => setShowNewChat(true)}
            className="rounded-full p-2 text-signal-subtext hover:bg-signal-panelAlt hover:text-signal-text"
          >
            ✏️
          </button>
          <button
            title="Settings"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-2 text-signal-subtext hover:bg-signal-panelAlt hover:text-signal-text"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-10 w-44 rounded-lg border border-signal-border bg-signal-panelAlt py-1 shadow-xl">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="block w-full px-4 py-2 text-left text-sm text-signal-text hover:bg-signal-bg"
              >
                Settings
              </button>
              <button
                onClick={logout}
                className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-signal-bg"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations"
          className="w-full rounded-lg border border-signal-border bg-signal-panelAlt px-3 py-1.5 text-sm text-signal-text outline-none focus:border-signal-accent"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="mt-8 px-4 text-center text-sm text-signal-subtext">
            No conversations yet. Start one with the ✏️ button.
          </p>
        )}
        {filtered.map((conv) => {
          const title = conversationTitle(conv, currentUser.id);
          const other = conv.type === "direct" ? conv.participants.find((p) => p.user.id !== currentUser.id) : null;
          const isOnline = other ? onlineUsers.has(other.user.id) : false;
          const preview = conv.last_message
            ? conv.last_message.content_type === "system"
              ? conv.last_message.content
              : `${conv.last_message.sender_id === currentUser.id ? "You: " : ""}${conv.last_message.content}`
            : "No messages yet";

          return (
            <button
              key={conv.id}
              onClick={() => router.push(`/chat/${conv.id}`)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-signal-panelAlt ${
                activeId === conv.id ? "bg-signal-panelAlt" : ""
              }`}
            >
              <Avatar
                id={conv.id}
                name={title}
                size={48}
                online={conv.type === "direct" ? isOnline : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-signal-text">{title}</p>
                  {conv.last_message && (
                    <span className="shrink-0 text-xs text-signal-subtext">
                      {formatTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs text-signal-subtext">{preview}</p>
                  {conv.unread_count > 0 && (
                    <span className="ml-2 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-signal-accent px-1.5 text-[11px] font-medium text-white">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onOpenConversation={(id) => router.push(`/chat/${id}`)} />
      )}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onOpenConversation={(id) => router.push(`/chat/${id}`)}
        />
      )}
    </div>
  );
}
