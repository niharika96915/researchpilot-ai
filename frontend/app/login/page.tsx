"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setMessage(
      "Account created successfully. Please check your email to verify your account."
    );

    setLoading(false);
  };

  const handleForgotPassword = () => {
    setMessage(
      "Password reset will be available soon. Please contact support for now."
    );
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setMessage("");
    setPassword("");
  };

  return (
    <main className="h-screen overflow-hidden bg-[#eef6ff] px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex h-full w-full max-w-md flex-col items-center">
        {/* BRAND */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-3 flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80 sm:mb-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-sm">
            RP
          </div>

          <span className="text-xl font-bold tracking-tight text-[#173b67] sm:text-2xl">
            ResearchPilot <span className="text-blue-600">AI</span>
          </span>
        </button>

        {/* AUTH CARD */}
        <div className="w-full rounded-3xl border border-blue-100 bg-white px-5 py-5 shadow-[0_15px_45px_rgba(30,64,175,0.08)] sm:px-7 sm:py-6">
          {/* HEADING */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#173b67] sm:text-[28px]">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Continue your research journey."
                : "Start your research journey with ResearchPilot."}
            </p>
          </div>

          {/* GOOGLE BUTTON */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#173b67] transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />

            <span>
              {loading ? "Please wait..." : "Continue with Google"}
            </span>
          </button>

          {/* DIVIDER */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />

            <span className="text-xs font-medium text-slate-400">OR</span>

            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-[#173b67]"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-[#f7faff] px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* PASSWORD */}
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-[#173b67]"
              >
                Password
              </label>

              {mode === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleEmailAuth();
                }
              }}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="w-full rounded-xl border border-slate-200 bg-[#f7faff] px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* MESSAGE */}
          {message && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-xs leading-5 text-blue-700">
              {message}
            </div>
          )}

          {/* MAIN BUTTON */}
          <button
            type="button"
            onClick={handleEmailAuth}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>

          {/* SWITCH AUTH MODE */}
          <div className="mt-3.5 text-center">
            <p className="text-sm text-slate-500">
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </p>

            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
              className="mt-0.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:opacity-50"
            >
              {mode === "login"
                ? "Create an account"
                : "Sign in to your account"}
            </button>
          </div>
        </div>

        {/* BOTTOM LINKS */}
        <div className="mt-3 flex shrink-0 flex-col items-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs font-medium text-slate-400 transition hover:text-blue-600"
          >
            ← Back to ResearchPilot
          </button>

          <p className="mt-1.5 text-[10px] text-slate-400">
            ResearchPilot AI · Agentic Research Assistant
          </p>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------
   GOOGLE ICON
------------------------------------------------------- */

function GoogleIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21.805 12.23c0-.79-.065-1.55-.205-2.28H12v4.31h5.49a4.69 4.69 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.055-4.4 3.055-7.67Z"
        fill="#4285F4"
      />

      <path
        d="M12 22c2.755 0 5.065-.91 6.75-2.46l-3.3-2.56c-.91.61-2.07.97-3.45.97-2.655 0-4.905-1.795-5.71-4.205H2.88v2.64A10.19 10.19 0 0 0 12 22Z"
        fill="#34A853"
      />

      <path
        d="M6.29 13.745A6.12 6.12 0 0 1 5.97 12c0-.605.105-1.195.32-1.745v-2.64H2.88A10.01 10.01 0 0 0 1.81 12c0 1.615.385 3.14 1.07 4.385l3.41-2.64Z"
        fill="#FBBC05"
      />

      <path
        d="M12 6.05c1.5 0 2.845.515 3.905 1.525l2.925-2.925C17.06 2.99 14.75 2 12 2a10.19 10.19 0 0 0-9.12 5.615l3.41 2.64C7.095 7.845 9.345 6.05 12 6.05Z"
        fill="#EA4335"
      />
    </svg>
  );
}