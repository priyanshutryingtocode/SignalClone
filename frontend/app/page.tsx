"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AuthRedirect from "@/components/AuthRedirect";
import { useStore } from "@/lib/store";

const FEATURES = [
  {
    title: "Real-time messaging",
    body: "Messages arrive instantly, with delivery and read receipts so you always know where a conversation stands.",
  },
  {
    title: "Group conversations",
    body: "Create groups, add or remove members, and manage conversations in one clean thread.",
  },
  {
    title: "Private by design",
    body: "A real-time messaging experience inspired by Signal Desktop, built around a clean and focused interface.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  const init = useStore((state) => state.init);

  const [checkingAuth, setCheckingAuth] = useState(false);

  /*
   * Landing page should ALWAYS be shown when the
   * application is opened.
   *
   * Authentication is checked only after the user
   * explicitly clicks a Sign in button.
   */
  async function handleSignIn() {
    if (checkingAuth) {
      return;
    }

    setCheckingAuth(true);

    try {
      const token =
        localStorage.getItem("signal_token");

      /*
       * No persisted session.
       */
      if (!token) {
        router.push("/login");
        return;
      }

      /*
       * A token exists, so validate it.
       */
      const authenticated = await init();

      if (authenticated) {
        router.push("/chat");
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error(
        "Failed to restore session:",
        error
      );

      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-signal-bg text-signal-text">
      <AuthRedirect />

      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-260px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-signal-accent/10 blur-3xl" />

        <div className="absolute right-[-180px] top-[35%] h-[360px] w-[360px] rounded-full bg-signal-accent/5 blur-3xl" />

        <div className="absolute left-[-180px] bottom-[10%] h-[320px] w-[320px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.04]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg shadow-signal-accent/20">
              <img src="/icon.png" alt="logo" className="h-5 w-5" />
              <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-signal-bg bg-emerald-400" />
            </div>

            <div>
              <div className="font-semibold tracking-tight">
                Signal Clone
              </div>

              <div className="hidden text-[11px] text-signal-subtext sm:block">
                Private messaging demo
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={checkingAuth}
              className="rounded-lg px-3 py-2 text-sm font-medium text-signal-subtext transition hover:bg-white/[0.04] hover:text-signal-text disabled:cursor-wait disabled:opacity-60 sm:px-4"
            >
              {checkingAuth
                ? "Checking..."
                : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/register")
              }
              className="rounded-lg bg-signal-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-signal-accent/10 transition duration-200 hover:bg-signal-accentHover hover:shadow-signal-accent/20 active:scale-[0.98]"
            >
              Create account
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Status badge */}
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-signal-border bg-signal-panel/70 px-3.5 py-1.5 text-xs text-signal-subtext shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
              Real-time messaging
            </div>

            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              Say it privately.
              <br />

              <span className="bg-gradient-to-r from-signal-accent via-blue-400 to-signal-accent bg-clip-text text-transparent">
                Say it instantly.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-signal-subtext sm:text-lg">
              A focused real-time messaging experience with
              direct and group conversations, delivery states,
              read receipts, and typing indicators.
            </p>

            {/* CTA buttons */}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  router.push("/register")
                }
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-signal-accent px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-signal-accent/15 transition duration-200 hover:-translate-y-0.5 hover:bg-signal-accentHover hover:shadow-signal-accent/25 active:translate-y-0 sm:w-auto"
              >
                Get started

                <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={handleSignIn}
                disabled={checkingAuth}
                className="w-full rounded-xl border border-signal-border bg-signal-panel/50 px-7 py-3.5 text-sm font-semibold text-signal-text backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-signal-accent/40 hover:bg-signal-panel disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {checkingAuth
                  ? "Checking session..."
                  : "I already have an account"}
              </button>
            </div>
          </div>
        </section>

        {/* Chat preview */}
        <section className="mx-auto max-w-5xl px-6 pb-24 lg:px-8">
          <div className="relative">
            {/* Glow behind preview */}
            <div className="absolute inset-x-16 top-10 h-32 rounded-full bg-signal-accent/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-2xl border border-signal-border bg-signal-panel shadow-2xl shadow-black/20">
              {/* Fake app header */}
              <div className="flex items-center justify-between border-b border-signal-border bg-signal-panel/90 px-5 py-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-accent/15 text-sm font-semibold text-signal-accent">
                    A
                  </div>

                  <div className="text-left">
                    <div className="text-sm font-medium">
                      Alice
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      online
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-signal-border" />
                  <span className="h-2 w-2 rounded-full bg-signal-border" />
                  <span className="h-2 w-2 rounded-full bg-signal-border" />
                </div>
              </div>

              {/* Messages */}
              <div className="min-h-[300px] space-y-3 bg-gradient-to-b from-signal-bg/40 to-signal-bg/80 p-6 sm:min-h-[350px] sm:p-8">
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl rounded-bl-sm border border-signal-border bg-signal-bubbleIn px-4 py-2.5 text-sm leading-5 text-signal-text shadow-sm">
                    hey! are we still on for
                    saturday?
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-signal-bubbleOut px-4 py-2.5 text-sm leading-5 text-white shadow-sm">
                    yep, 9am works
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl rounded-bl-sm border border-signal-border bg-signal-bubbleIn px-4 py-2.5 text-sm leading-5 text-signal-text shadow-sm">
                    perfect, see you then
                  </div>
                </div>

                {/* Typing indicator */}
                <div className="flex items-center gap-2 pt-1 text-xs text-signal-subtext">
                  <div className="flex items-center gap-1 rounded-full bg-signal-panel px-3 py-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-subtext" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-subtext [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-subtext [animation-delay:300ms]" />
                  </div>

                  Alice is typing
                </div>
              </div>

              {/* Fake message input */}
              <div className="border-t border-signal-border bg-signal-panel p-4">
                <div className="flex items-center gap-3 rounded-xl border border-signal-border bg-signal-bg px-4 py-3">
                  <span className="text-sm text-signal-subtext">
                    Write a message...
                  </span>

                  <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-signal-accent text-sm text-white">
                    ↑
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-28 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal-accent">
              Built for conversation
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything you need to stay connected.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-signal-border bg-signal-panel/70 p-6 transition duration-200 hover:-translate-y-1 hover:border-signal-accent/30 hover:bg-signal-panel hover:shadow-xl hover:shadow-black/10"
              >

                <h3 className="text-sm font-semibold text-signal-text">
                  {feature.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-signal-subtext">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-signal-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-7 text-center text-xs text-signal-subtext sm:flex-row sm:text-left lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-signal-accent/15 text-[10px] font-bold text-signal-accent">
             <img src="/icon.png" alt="logo" className="h-5 w-5" />
            </div>

            <span>
              Signal Clone - Made by Priyanshu Srivastava
            </span>
          </div>

          <span>
            A demo messaging app.
          </span>
        </div>
      </footer>
    </div>
  );
}