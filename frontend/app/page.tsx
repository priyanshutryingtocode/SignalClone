import Link from "next/link";
import AuthRedirect from "@/components/AuthRedirect";

const FEATURES = [
  {
    title: "Real-time messaging",
    body: "Messages arrive instantly, with delivery and read receipts so you always know where a conversation stands.",
  },
  {
    title: "Group conversations",
    body: "Create groups, add or remove members, and hand out admin controls — all in one clean thread.",
  },
  {
    title: "Private by design",
    body: "Every message is encrypted before it leaves your device, so conversations stay between you and who you're talking to.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-signal-bg text-signal-text">
      <AuthRedirect />

      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-accent text-lg font-bold">
            S
          </div>
          <span className="font-semibold">Signal Clone</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-signal-subtext hover:text-signal-text">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-signal-accent px-4 py-2 text-sm font-medium text-white hover:bg-signal-accentHover"
          >
            Create account
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-16 text-center">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Say it privately.
          <br />
          <span className="text-signal-accent">Say it instantly.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-signal-subtext sm:text-lg">
          A messaging app built for direct and group conversations that stay just between the people in them —
          real-time delivery, read receipts, and typing indicators, without the noise.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-signal-accent px-6 py-3 text-sm font-medium text-white hover:bg-signal-accentHover"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-signal-border px-6 py-3 text-sm font-medium text-signal-text hover:bg-signal-panel"
          >
            I already have an account
          </Link>
        </div>
      </section>

      {/* Preview strip */}
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
                yep, 9am works ✓✓
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

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-signal-border bg-signal-panel p-5">
              <h3 className="mb-2 text-sm font-semibold text-signal-text">{f.title}</h3>
              <p className="text-sm text-signal-subtext">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-signal-border px-6 py-6 text-center text-xs text-signal-subtext">
        Signal Clone — a demo messaging app. Not affiliated with Signal Foundation.
      </footer>
    </div>
  );
}