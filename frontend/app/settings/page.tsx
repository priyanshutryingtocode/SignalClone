"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { useStore } from "@/lib/store";

const TABS = ["Profile", "Privacy", "Notifications", "Appearance"] as const;

export default function SettingsPage() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-signal-bg">
      <div className="w-64 shrink-0 border-r border-signal-border bg-signal-panel p-4">
        <button onClick={() => router.push("/chat")} className="mb-4 text-sm text-signal-subtext hover:text-signal-text">
          ← Back to chats
        </button>
        <h1 className="mb-4 text-lg font-semibold text-signal-text">Settings</h1>
        <nav className="flex flex-col gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-left text-sm ${
                tab === t ? "bg-signal-accent text-white" : "text-signal-subtext hover:bg-signal-panelAlt"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-8">
        {tab === "Profile" && (
          <div className="max-w-md">
            <div className="mb-6 flex items-center gap-4">
              <Avatar id={currentUser.id} name={currentUser.display_name} size={64} />
              <div>
                <p className="text-lg font-medium text-signal-text">{currentUser.display_name}</p>
                <p className="text-sm text-signal-subtext">@{currentUser.username}</p>
              </div>
            </div>
            <SettingRow label="Phone number" value={currentUser.phone_number} />
            <SettingRow label="Username" value={`@${currentUser.username}`} />
          </div>
        )}

        {tab === "Privacy" && (
          <PlaceholderSection
            title="Privacy"
            rows={["Read receipts", "Typing indicators", "Who can see my last seen", "Blocked contacts"]}
          />
        )}

        {tab === "Notifications" && (
          <PlaceholderSection title="Notifications" rows={["Message notifications", "Sound", "Show preview"]} />
        )}

        {tab === "Appearance" && (
          <PlaceholderSection title="Appearance" rows={["Theme: Dark", "Chat wallpaper", "Message text size"]} />
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-signal-border pb-3">
      <span className="text-sm text-signal-subtext">{label}</span>
      <span className="text-sm text-signal-text">{value}</span>
    </div>
  );
}

function PlaceholderSection({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="max-w-md">
      <h2 className="mb-4 text-lg font-medium text-signal-text">{title}</h2>
      <div className="rounded-xl border border-signal-border bg-signal-panel">
        {rows.map((r, i) => (
          <div
            key={r}
            className={`flex items-center justify-between px-4 py-3 ${i !== rows.length - 1 ? "border-b border-signal-border" : ""}`}
          >
            <span className="text-sm text-signal-text">{r}</span>
            <span className="text-xs text-signal-subtext">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
