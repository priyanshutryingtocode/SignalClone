"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Icon from "./Icon";
import NewChatModal from "./NewChatModal";
import NewGroupModal from "./NewGroupModal";
import { useStore } from "@/lib/store";
import { Conversation } from "@/lib/types";

function conversationTitle(conv: Conversation, myId: string): string {
  if (conv.type === "group") return conv.name ?? "Group";
  return (
    conv.participants.find((participant) => participant.user.id !== myId)?.user.display_name ??
    "Unknown"
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
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
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      const title = conversationTitle(conversation, currentUser.id).toLowerCase();
      const preview = conversation.last_message?.content.toLowerCase() ?? "";
      return title.includes(query) || preview.includes(query);
    });
  }, [conversations, search, currentUser]);

  if (!currentUser) return null;

  return (
    <aside className="hidden h-full w-[340px] min-w-[300px] max-w-[400px] shrink-0 flex-col border-r border-signal-border/70 bg-signal-panel md:flex">
      <div className="relative flex h-[62px] shrink-0 items-center justify-between border-b border-signal-border/70 px-4">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex min-w-0 items-center gap-3 rounded-lg py-1 pr-2 text-left transition-colors hover:bg-signal-panelAlt"
        >
          <Avatar id={currentUser.id} name={currentUser.display_name} size={38} />
          <span className="truncate text-[15px] font-medium text-signal-text">
            {currentUser.display_name}
          </span>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="New conversation"
            title="New conversation"
            onClick={() => setShowNewChat(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-panelAlt hover:text-signal-text"
          >
            <Icon name="plus" size={20} />
          </button>
          <button
            type="button"
            aria-label="More options"
            title="More options"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-signal-subtext transition-colors hover:bg-signal-panelAlt hover:text-signal-text"
          >
            <Icon name="more" size={20} />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute right-4 top-14 z-30 w-48 overflow-hidden rounded-xl border border-signal-border bg-signal-panelAlt py-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setShowNewChat(true);
              }}
              className="flex w-full px-4 py-2.5 text-left text-sm text-signal-text hover:bg-signal-bg"
            >
              New conversation
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setShowNewGroup(true);
              }}
              className="flex w-full px-4 py-2.5 text-left text-sm text-signal-text hover:bg-signal-bg"
            >
              New group
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push("/settings");
              }}
              className="flex w-full px-4 py-2.5 text-left text-sm text-signal-text hover:bg-signal-bg"
            >
              Settings
            </button>
            <div className="my-1 border-t border-signal-border" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="flex w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-signal-bg"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      <div className="px-3 py-2.5">
        <label className="flex h-9 items-center gap-2 rounded-lg bg-signal-panelAlt px-3 text-signal-subtext focus-within:ring-1 focus-within:ring-signal-borderLight">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search conversations"
            className="min-w-0 flex-1 bg-transparent text-sm text-signal-text outline-none placeholder:text-signal-subtext"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-signal-subtext">
            No conversations
          </p>
        ) : (
          filtered.map((conversation) => {
            const title = conversationTitle(conversation, currentUser.id);
            const other =
              conversation.type === "direct"
                ? conversation.participants.find((p) => p.user.id !== currentUser.id)
                : null;
            const isActive = activeId === conversation.id;
            const isOnline = other ? onlineUsers.has(other.user.id) : false;
            const preview = conversation.last_message
              ? `${conversation.last_message.sender_id === currentUser.id ? "You: " : ""}${conversation.last_message.content}`
              : "No messages yet";

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => router.push(`/chat/${conversation.id}`)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isActive ? "bg-signal-panelAlt" : "hover:bg-signal-panelAlt/70"
                }`}
              >
                <Avatar
                  id={conversation.id}
                  name={title}
                  size={44}
                  online={conversation.type === "direct" ? isOnline : undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-signal-text">
                      {title}
                    </p>
                    {conversation.last_message && (
                      <span className="shrink-0 text-[11px] text-signal-subtext">
                        {formatTime(conversation.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-signal-subtext">
                      {preview}
                    </p>
                    {conversation.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-signal-accent px-1.5 text-[10px] font-semibold text-white">
                        {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onOpenConversation={(id) => router.push(`/chat/${id}`)}
        />
      )}
      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onOpenConversation={(id) => router.push(`/chat/${id}`)}
        />
      )}
    </aside>
  );
}
