"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const register = useStore((s) => s.register);

  const [step, setStep] = useState<"details" | "otp">("details");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Mocked verification: in a real Signal build this triggers an SMS.
    // Here we just move to the OTP step; the fixed code is 123456.
    setStep("otp");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        phone_number: phone,
        username,
        password,
        display_name: displayName,
        otp,
      });
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-signal-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-signal-border bg-signal-panel p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-accent text-2xl font-bold">
            S
          </div>
          <h1 className="text-xl font-semibold text-signal-text">
            {step === "details" ? "Create your account" : "Verify your number"}
          </h1>
        </div>

        {step === "details" && (
          <form onSubmit={requestOtp} className="flex flex-col gap-4">
            <Field label="Phone number">
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0100"
                required
              />
            </Field>
            <Field label="Username">
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                required
              />
            </Field>
            <Field label="Display name">
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice Smith"
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <button type="submit" className="btn-primary mt-2">
              Continue
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <p className="text-sm text-signal-subtext">
              Enter the code sent to <span className="text-signal-text">{phone}</span>. This is mocked — use{" "}
              <code className="rounded bg-signal-panelAlt px-1 py-0.5 text-signal-text">123456</code>.
            </p>
            <Field label="Verification code">
              <input
                className="input tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
              />
            </Field>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? "Verifying…" : "Verify & create account"}
            </button>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="text-sm text-signal-subtext hover:text-signal-text"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-signal-subtext">
          Already have an account?{" "}
          <Link href="/login" className="text-signal-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #2a3a4a;
          background-color: #212f3d;
          padding: 0.5rem 0.75rem;
          color: #e9edf1;
          outline: none;
        }
        .input:focus {
          border-color: #2c6bed;
        }
        .btn-primary {
          border-radius: 0.5rem;
          background-color: #2c6bed;
          padding: 0.5rem 1rem;
          font-weight: 500;
          color: white;
          transition: background-color 0.15s ease;
        }
        .btn-primary:hover {
          background-color: #3b78f6;
        }
        .btn-primary:disabled {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-signal-subtext">{label}</label>
      {children}
    </div>
  );
}
