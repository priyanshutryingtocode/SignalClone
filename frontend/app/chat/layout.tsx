"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { useStore } from "@/lib/store";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const init = useStore((s) => s.init);
  const currentUser = useStore((s) => s.currentUser);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const token = localStorage.getItem("signal_token");
      if (!token) {
        router.replace("/");
        return;
      }

      try {
        await init();
      } finally {
        if (mounted) setChecked(true);
      }
    })();

    return () => {
      mounted = false;
    };
    // init is a stable Zustand action for the lifetime of the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checked && !currentUser) {
      router.replace("/");
    }
  }, [checked, currentUser, router]);

  if (!checked || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-signal-bg text-sm text-signal-subtext">
        Loading…
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen min-h-0 overflow-hidden bg-signal-bg">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </ToastProvider>
  );
}
