"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

/**
 * Renders nothing. If a valid session already exists, sends the user
 * straight to /chat. Otherwise leaves the landing page visible.
 */
export default function AuthRedirect() {
  const router = useRouter();
  const init = useStore((s) => s.init);

  useEffect(() => {
    (async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("signal_token") : null;
      if (!token) return;
      await init();
      const stillValid = typeof window !== "undefined" ? localStorage.getItem("signal_token") : null;
      if (stillValid) router.replace("/chat");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}