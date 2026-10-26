"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");

  const [credits, setCredits] = useState(0);
  const [researchCount, setResearchCount] = useState(0);

  const [researchDepth, setResearchDepth] = useState("standard");
  const [sourcesPerQuery, setSourcesPerQuery] = useState("3");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [citationStyle, setCitationStyle] = useState("numbered");

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("username, full_name, credits")
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error(profileError);
        setError("Could not load your profile.");
        setLoading(false);
        return;
      }

      setUsername(profile?.username || "");
      setFullName(profile?.full_name || "");
      setCredits(profile?.credits ?? 0);

      const { count } = await supabase
        .from("research_history")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id);

      setResearchCount(count ?? 0);

      // Load saved research settings
      const { data: settings, error: settingsError } =
        await supabase
          .from("user_settings")
          .select(
            "research_depth, sources_per_query, export_format, citation_style"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (settingsError) {
        console.error("Settings fetch error:", settingsError);
      }

      if (settings) {
        setResearchDepth(settings.research_depth);
        setSourcesPerQuery(
          String(settings.sources_per_query)
        );
        setExportFormat(settings.export_format);
        setCitationStyle(settings.citation_style);
      }

      setLoading(false);
    };

    loadSettings();
  }, [router]);

  const saveChanges = async () =>{
    setSaving(true);
    setMessage("");
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Save profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error(profileError);
      setError(profileError.message);
      setSaving(false);
      return;
    }

    // Save research settings
    const { error: settingsError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          research_depth: researchDepth,
          sources_per_query: Number(sourcesPerQuery),
          export_format: exportFormat,
          citation_style: citationStyle,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

   if (settingsError) {
  setError("Could not save your research preferences.");
  setSaving(false);
  return;
}

    setMessage("Changes saved successfully.");
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8ff]">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <span className="text-sm font-medium text-slate-500">
            Loading settings...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8ff] text-slate-900">
      <div className="pointer-events-none fixed -right-32 -top-32 h-80 w-80 rounded-full bg-blue-200/20 blur-3xl" />

      <div className="pointer-events-none fixed -bottom-32 -left-32 h-80 w-80 rounded-full bg-indigo-200/20 blur-3xl" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-7">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-[0_5px_15px_rgba(37,99,235,0.25)]">
              RP
            </div>

            <div className="text-left">
              <div className="text-[17px] font-bold tracking-tight text-[#173b67]">
                ResearchPilot{" "}
                <span className="text-blue-600">AI</span>
              </div>

              <div className="text-[10px] font-medium text-slate-400">
                AI Research Workspace
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <section className="relative z-10 px-5 py-5 sm:px-7">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Account Settings
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#173b67]">
              Settings
            </h1>

            <p className="mt-0.5 text-xs text-slate-400">
              Manage your account and ResearchPilot preferences.
            </p>
          </div>

          {message && (
            <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
            {/* Profile */}
            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_12px_35px_rgba(30,64,175,0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                  👤
                </div>

                <div>
                  <h2 className="text-sm font-bold text-[#173b67]">
                    Profile
                  </h2>

                  <p className="text-[10px] text-slate-400">
                    Your account information
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#f8fbff] p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {(fullName || username || "R")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#173b67]">
                    {fullName || username || "Researcher"}
                  </p>

                  <p className="truncate text-[10px] text-slate-400">
                    {email}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InputField
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="Your username"
                />

                <InputField
                  label="Full Name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Your full name"
                />

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    disabled
                    className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400"
                  />
                </div>
              </div>
            </section>

            {/* Research Preferences */}
            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_12px_35px_rgba(30,64,175,0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                  ⚙️
                </div>

                <div>
                  <h2 className="text-sm font-bold text-[#173b67]">
                    Research Preferences
                  </h2>

                  <p className="text-[10px] text-slate-400">
                    Customize your research experience
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <SettingSelect
                  label="Research Depth"
                  value={researchDepth}
                  options={[
                    { value: "quick", label: "Quick" },
                    { value: "standard", label: "Standard" },
                    { value: "deep", label: "Deep" },
                  ]}
                  onChange={setResearchDepth}
                />

                <SettingSelect
                  label="Sources per Query"
                  value={sourcesPerQuery}
                  options={[
                    { value: "1", label: "1 source" },
                    { value: "2", label: "2 sources" },
                    { value: "3", label: "3 sources" },
                    { value: "4", label: "4 sources" },
                    { value: "5", label: "5 sources" },
                  ]}
                  onChange={setSourcesPerQuery}
                />

                <SettingSelect
                  label="Default Export Format"
                  value={exportFormat}
                  options={[
                    { value: "pdf", label: "PDF" },
                    { value: "markdown", label: "Markdown" },
                  ]}
                  onChange={setExportFormat}
                />

                <SettingSelect
                  label="Citation Style"
                  value={citationStyle}
                  options={[
                    { value: "numbered", label: "Numbered" },
                    { value: "inline", label: "Inline" },
                  ]}
                  onChange={setCitationStyle}
                />
              </div>
            </section>
          </div>

          {/* Usage */}
          <section className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_12px_35px_rgba(30,64,175,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-50">
                  ✦
                </div>

                <div>
                  <h2 className="text-sm font-bold text-[#173b67]">
                    Usage
                  </h2>

                  <p className="text-[10px] text-slate-400">
                    Your ResearchPilot activity
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl bg-slate-100 px-3.5 py-2 text-[10px] font-bold text-slate-400"
              >
                Buy Credits · Soon
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <UsageCard
                label="Available Credits"
                value={credits}
              />

              <UsageCard
                label="Researches"
                value={researchCount}
              />

              <UsageCard
                label="Reports"
                value={researchCount}
              />
            </div>
          </section>

          {/* Actions */}
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
            >
              Sign out
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveChanges}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(37,99,235,0.2)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200 bg-white px-5 py-3 text-center text-[10px] text-slate-400">
        ResearchPilot AI · Agentic Research Assistant
      </footer>
    </main>
  );
}

/* =========================================================
   INPUT
========================================================= */

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fbff] px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

/* =========================================================
   SELECT
========================================================= */

function SettingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fbff] px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================================================
   USAGE CARD
========================================================= */

function UsageCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-[#f8fbff] px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-xl font-bold tracking-tight text-[#173b67]">
        {value}
      </p>
    </div>
  );
}