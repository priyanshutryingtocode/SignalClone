"use client";

import { useState } from "react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "./Toast";
import { User } from "@/lib/types";

export default function NewChatModal({ onClose, onOpenConversation }: { onClose: () => void; onOpenConversation: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const createDirectConversation = useStore((s) => s.createDirectConversation);
  const toast = useToast();

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await api<User[]>(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(users);
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  }

  async function startChat(user: User) {
    try {
      await api("/contacts", { method: "POST", body: { contact_user_id: user.id } }).catch(() => {
        // already a contact — fine, continue to start the conversation
      });
      const conv = await createDirectConversation(user.id);
      toast(`Started a chat with ${user.display_name}`);
      onOpenConversation(conv.id);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not start chat");
    }
  }

  return (
    <Modal title="New chat" onClose={onClose}>
      <input
        autoFocus
        className="mb-4 w-full rounded-lg border border-signal-border bg-signal-panelAlt px-3 py-2 text-signal-text outline-none focus:border-signal-accent"
        placeholder="Search by username, phone, or name"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div className="max-h-72 overflow-y-auto">
        {searching && <p className="text-sm text-signal-subtext">Searching…</p>}
        {!searching && query && results.length === 0 && (
          <p className="text-sm text-signal-subtext">No users found.</p>
        )}
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => startChat(u)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-signal-panelAlt"
          >
            <Avatar id={u.id} name={u.display_name} size={40} />
            <div>
              <p className="text-sm font-medium text-signal-text">{u.display_name}</p>
              <p className="text-xs text-signal-subtext">@{u.username}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
