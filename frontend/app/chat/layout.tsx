"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { useStore } from "@/lib/store";

type AuthStatus =
  | "checking"
  | "authenticated"
  | "unauthenticated";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const init = useStore(
    (state) => state.init
  );

  const currentUser = useStore(
    (state) => state.currentUser
  );

  const [status, setStatus] =
    useState<AuthStatus>("checking");


  /*
   * Authenticate when /chat is first opened.
   *
   * This protects direct navigation to:
   *
   * /chat
   *
   * without a valid session.
   */
  useEffect(() => {
    let cancelled = false;

    async function checkAuthentication() {
      if (
        typeof window === "undefined"
      ) {
        return;
      }

      const token =
        localStorage.getItem(
          "signal_token"
        );

      /*
       * No token at all.
       *
       * This is someone trying to access
       * /chat without logging in.
       */
      if (!token) {
        if (!cancelled) {
          setStatus(
            "unauthenticated"
          );

          router.replace("/login");
        }

        return;
      }

      try {
        /*
         * If Zustand already has the user,
         * there is no need to validate again.
         */
        let authenticated =
          Boolean(
            useStore.getState()
              .currentUser
          );

        if (!authenticated) {
          authenticated =
            await init();
        }

        if (cancelled) {
          return;
        }

        if (!authenticated) {
          setStatus(
            "unauthenticated"
          );

          router.replace("/login");

          return;
        }

        setStatus(
          "authenticated"
        );

      } catch (error) {
        console.error(
          "Chat authentication failed:",
          error
        );

        if (!cancelled) {
          setStatus(
            "unauthenticated"
          );

          router.replace("/login");
        }
      }
    }

    checkAuthentication();

    return () => {
      cancelled = true;
    };
  }, [init, router]);


  /*
   * IMPORTANT:
   *
   * This handles LOGOUT.
   *
   * logout() clears currentUser in Zustand.
   * When that happens while the chat is open,
   * redirect to the LANDING PAGE.
   *
   * We deliberately do this only after the
   * initial authentication check has completed.
   */
  useEffect(() => {
    if (
      status !==
      "authenticated"
    ) {
      return;
    }

    if (currentUser !== null) {
      return;
    }

    /*
     * The user logged out.
     *
     * Make sure the token is gone as well.
     */
    if (
      typeof window !==
      "undefined"
    ) {
      localStorage.removeItem(
        "signal_token"
      );
    }

    router.replace("/");
  }, [
    currentUser,
    status,
    router,
  ]);


  /*
   * Initial authentication check.
   */
  if (
    status === "checking"
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-signal-bg text-signal-subtext">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal-border border-t-signal-accent" />

          <span className="text-sm">
            Loading…
          </span>
        </div>
      </div>
    );
  }


  /*
   * Authentication failed.
   *
   * The redirect has already been initiated.
   * Render nothing to avoid a flash of the
   * chat interface.
   */
  if (
    status ===
      "unauthenticated" ||
    !currentUser
  ) {
    return null;
  }


  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-signal-bg">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}