"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { useStore } from "@/lib/store";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const init = useStore((s) => s.init);
  const currentUser = useStore((s) => s.currentUser);

  const [checked, setChecked] = useState(false);

  /*
   * Initial authentication check.
   */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("signal_token")
          : null;

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        await init();
      } finally {
        if (mounted) {
          setChecked(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };

    // init is intentionally excluded because this should
    // only perform the initial authentication check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Handle logout.
   *
   * When logout() clears currentUser, redirect to login
   * instead of leaving the chat layout stuck on Loading.
   */
  useEffect(() => {
    if (checked && !currentUser) {
      router.replace("/");
    }
  }, [checked, currentUser, router]);

  if (!checked || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-signal-bg text-signal-subtext">
        Loading…
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-signal-bg">
        <Sidebar />

        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}