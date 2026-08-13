"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("signal_token");

    if (token) {
      router.replace("/chat");
    }
  }, [router]);

  return null;
}