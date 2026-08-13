"use client";

import { useRouter } from "next/navigation";
import AuthRedirect from "@/components/AuthRedirect";

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
    body: "A real-time messaging experience inspired by Signal Desktop.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-signal-bg text-signal-text">
      <AuthRedirect />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-accent text-lg font-bold">
            S
          </div>

          <span className="font-semibold">
            Signal Clone
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-sm text-signal-subtext transition hover:text-signal-text"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => router.push("/register")}
            className="rounded-lg bg-signal-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-signal-accentHover"
          >
            Create account
          </button>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-16 text-center">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Say it privately.
          <br />
          <span className="text-signal-accent">
            Say it instantly.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base text-signal-subtext sm:text-lg">
          A real-time messaging application with direct and
          group conversations, delivery states, read receipts,
          and typing indicators.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="rounded-lg bg-signal-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-signal-accentHover"
          >
            Get started
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="rounded-lg border border-signal-border px-6 py-3 text-sm font-medium text-signal-text transition hover:bg-signal-panel"
          >
            I already have an account
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-signal-border bg-signal-panel p-6 shadow-2xl">
          <div className="flex flex-col gap-2">
            <div className="flex justify-start">
              <div className="max-w-[60%] rounded-2xl rounded-bl-sm bg-signal-bubbleIn px-3 py-2 text-sm text-signal-text">
                hey! are we still on for saturday?
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[60%] rounded-2xl rounded-br-sm bg-signal-bubbleOut px-3 py-2 text-sm text-white">
                yep, 9am works
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[60%] rounded-2xl rounded-bl-sm bg-signal-bubbleIn px-3 py-2 text-sm text-signal-text">
                perfect, see you then
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-signal-border bg-signal-panel p-5"
            >
              <h3 className="mb-2 text-sm font-semibold text-signal-text">
                {feature.title}
              </h3>

              <p className="text-sm text-signal-subtext">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-signal-border px-6 py-6 text-center text-xs text-signal-subtext">
        Signal Clone — a demo messaging app. Not affiliated
        with Signal Foundation.
      </footer>
    </div>
  );
}