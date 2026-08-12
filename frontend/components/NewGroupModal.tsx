"use client";

import { useState } from "react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "./Toast";
import { User } from "@/lib/types";

export default function NewGroupModal({ onClose, onOpenConversation }: { onClose: () => void; onOpenConversation: (id: string) => void }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const createGroupConversation = useStore((s) => s.createGroupConversation);
  const toast = useToast();

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    const users = await api<User[]>(`/users/search?q=${encodeURIComponent(q)}`);
    setResults(users);
  }

  function toggle(user: User) {
    setSelected((s) => (s.some((u) => u.id === user.id) ? s.filter((u) => u.id !== user.id) : [...s, user]));
  }

  async function handleCreate() {
    if (!name.trim() || selected.length === 0) {
      toast("Add a name and at least one member");
      return;
    }
    try {
      const conv = await createGroupConversation(
        name.trim(),
        selected.map((u) => u.id)
      );
      toast(`Group "${name}" created`);
      onOpenConversation(conv.id);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not create group");
    }
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <input
        autoFocus
        className="mb-3 w-full rounded-lg border border-signal-border bg-signal-panelAlt px-3 py-2 text-signal-text outline-none focus:border-signal-accent"
        placeholder="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1 rounded-full bg-signal-panelAlt px-2 py-1 text-xs text-signal-text"
            >
              {u.display_name}
              <button onClick={() => toggle(u)} className="text-signal-subtext hover:text-signal-text">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        className="mb-3 w-full rounded-lg border border-signal-border bg-signal-panelAlt px-3 py-2 text-signal-text outline-none focus:border-signal-accent"
        placeholder="Add members…"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div className="mb-4 max-h-52 overflow-y-auto">
        {results.map((u) => {
          const isSelected = selected.some((s) => s.id === u.id);
          return (
            <button
              key={u.id}
              onClick={() => toggle(u)}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-signal-panelAlt ${
                isSelected ? "bg-signal-panelAlt" : ""
              }`}
            >
              <Avatar id={u.id} name={u.display_name} size={36} />
              <div>
                <p className="text-sm font-medium text-signal-text">{u.display_name}</p>
                <p className="text-xs text-signal-subtext">@{u.username}</p>
              </div>
              {isSelected && <span className="ml-auto text-signal-accent">✓</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleCreate}
        className="w-full rounded-lg bg-signal-accent py-2 font-medium text-white hover:bg-signal-accentHover"
      >
        Create group
      </button>
    </Modal>
  );
}
