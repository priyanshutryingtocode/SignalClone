"use client";

import { useState } from "react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "./Toast";
import { Conversation, User } from "@/lib/types";

export default function GroupMembersModal({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const currentUser = useStore((s) => s.currentUser);
  const loadConversations = useStore((s) => s.loadConversations);
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);

  const myRole = conversation.participants.find((p) => p.user.id === currentUser?.id)?.role;
  const isAdmin = myRole === "admin";

  async function handleSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const users = await api<User[]>(`/users/search?q=${encodeURIComponent(q)}`);
    const existingIds = new Set(conversation.participants.map((p) => p.user.id));
    setResults(users.filter((u) => !existingIds.has(u.id)));
  }

  async function addMember(user: User) {
    try {
      await api(`/conversations/${conversation.id}/participants?user_id=${user.id}`, { method: "POST" });
      toast(`${user.display_name} added`);
      setQuery("");
      setResults([]);
      await loadConversations();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add member");
    }
  }

  async function removeMember(userId: string, name: string) {
    try {
      await api(`/conversations/${conversation.id}/participants/${userId}`, { method: "DELETE" });
      toast(`${name} removed`);
      await loadConversations();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove member");
    }
  }

  return (
    <Modal title={`${conversation.name} · Members`} onClose={onClose}>
      <div className="mb-4 max-h-56 overflow-y-auto">
        {conversation.participants.map((p) => (
          <div key={p.user.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar id={p.user.id} name={p.user.display_name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-signal-text">
                {p.user.display_name} {p.user.id === currentUser?.id && <span className="text-signal-subtext">(you)</span>}
              </p>
              {p.role === "admin" && <p className="text-xs text-signal-accent">Admin</p>}
            </div>
            {isAdmin && p.user.id !== currentUser?.id && (
              <button
                onClick={() => removeMember(p.user.id, p.user.display_name)}
                className="text-xs text-red-400 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <>
          <input
            className="mb-2 w-full rounded-lg border border-signal-border bg-signal-panelAlt px-3 py-2 text-sm text-signal-text outline-none focus-visible:ring-2 focus-visible:ring-signal-accent/40 focus-visible:ring-offset-2"
            placeholder="Add a member…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className="max-h-40 overflow-y-auto">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => addMember(u)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-signal-panelAlt hover:transition-colors duration-150"
              >
                <Avatar id={u.id} name={u.display_name} size={32} />
                <p className="text-sm text-signal-text">{u.display_name}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
