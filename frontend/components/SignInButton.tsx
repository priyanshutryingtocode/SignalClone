"use client";

import {
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import { useStore } from "@/lib/store";


interface SignInButtonProps {
  children?: ReactNode;
  className?: string;
}


export default function SignInButton({
  children = "Sign in",
  className = "",
}: SignInButtonProps) {
  const router = useRouter();

  const init =
    useStore(
      (state) => state.init
    );

  const [loading, setLoading] =
    useState(false);


  async function handleClick() {
    if (loading) {
      return;
    }


    setLoading(true);


    try {
      /*
       * Check whether there is a persisted
       * authentication token.
       */
      const token =
        localStorage.getItem(
          "signal_token"
        );


      /*
       * No token:
       *
       * Go to the actual login form.
       */
      if (!token) {
        router.push("/login");
        return;
      }


      /*
       * Token exists.
       *
       * Validate it with /auth/me.
       */
      const authenticated =
        await init();


      if (authenticated) {
        /*
         * Valid session:
         * skip login and go directly to chat.
         */
        router.push("/chat");
        return;
      }


      /*
       * Token exists but is invalid/expired.
       *
       * init() clears invalid sessions.
       */
      router.push("/login");

    } catch (error) {
      console.error(
        "Failed to check authentication:",
        error
      );

      /*
       * If session validation fails for some
       * unexpected reason, take the user to
       * the login page instead of leaving them
       * stuck on the landing page.
       */
      router.push("/login");

    } finally {
      setLoading(false);
    }
  }


  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading
        ? "Loading…"
        : children}
    </button>
  );
}