"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const init = useStore((s) => s.init);
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    (async () => {
      await init();
      const token = typeof window !== "undefined" ? localStorage.getItem("signal_token") : null;
      if (token) router.replace("/chat");
      else router.replace("/login");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-signal-bg text-signal-subtext">
      Loading Signal Clone…
    </div>
  );
}
