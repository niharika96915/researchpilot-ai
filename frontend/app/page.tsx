"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
   method?: {
    upi?: boolean;
    card?: boolean;
    netbanking?: boolean;
    wallet?: boolean;
   };
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpayPaymentResponse) => void;
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Citation = {
  id: number;
  title: string;
  url: string;
};

type ResearchReport = {
  query: string;
  executive_summary: string;
  key_findings: string[];
  detailed_analysis: string;
  citations: Citation[];
};

type ResearchResponse = {
  query: string;
  status: string;
  message: string;
  research_questions: string[];
  sources: unknown[];
  evidence: unknown[];
  synthesis: {
    executive_summary: string;
    key_findings: string[];
    detailed_analysis: string;
  };
  citations: Citation[];
  report: ResearchReport;
};

type HistoryItem = {
  id: string;
  query: string;
  executive_summary: string;
  key_findings: string[];
  detailed_analysis: string;
  citations: Citation[];
  created_at: string;
};

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  popular?: boolean;
};

type PurchaseStatus =
  | "success"
  | "failed"
  | "cancelled"
  | null;
type PurchaseHistoryItem = {
  id: string;
  package_name: string;
  credits: number;
  amount: number;
  currency: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  created_at: string;
};

const supabase = createClient();

const progressStages = [
  "Understanding your question",
  "Creating research plan",
  "Searching the web",
  "Analyzing evidence",
  "Writing research report",
];

const exampleQueries = [
  "Impact of AI on the future of software engineering",
  "Latest trends in generative AI",
  "How does RAG improve AI reliability?",
];

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 99,
    description: "For occasional research",
  },
  {
    id: "popular",
    name: "Researcher",
    credits: 120,
    price: 199,
    description: "For regular research",
    popular: true,
  },
  {
    id: "pro",
    name: "Power",
    credits: 300,
    price: 449,
    description: "For heavy research usage",
  },
];

export default function Home() {
  const router = useRouter();

  // =========================================================
  // RESEARCH STATE
  // =========================================================

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] =
    useState<ResearchResponse | null>(null);

  const [error, setError] = useState("");

  const [exporting, setExporting] = useState<
    "pdf" | "markdown" | null
  >(null);

  // =========================================================
  // USER / PROFILE STATE
  // =========================================================

  const [userName, setUserName] = useState("Researcher");
  const [userEmail, setUserEmail] = useState("");
  const [credits, setCredits] = useState(0);
  const [researchCount, setResearchCount] = useState(0);
  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [profileOpen, setProfileOpen] =
    useState(false);

  // =========================================================
  // CREDIT / PAYMENT STATE
  // =========================================================

  const [buyCreditsOpen, setBuyCreditsOpen] =
    useState(false);

  const [selectedPackage, setSelectedPackage] =
    useState<CreditPackage | null>(null);

  const [purchaseLoading, setPurchaseLoading] =
    useState(false);

  const [purchaseStatus, setPurchaseStatus] =
    useState<PurchaseStatus>(null);
  const [purchaseHistory, setPurchaseHistory] =
  useState<PurchaseHistoryItem[]>([]);

const [purchaseHistoryLoading, setPurchaseHistoryLoading] =
  useState(false);

  // =========================================================
// LOAD PAYMENT HISTORY
// =========================================================

const loadPurchaseHistory = async (
  userId: string
) => {
  setPurchaseHistoryLoading(true);

  try {
    const {
      data,
      error: purchaseError,
    } = await supabase
      .from("credit_purchases")
      .select(
        "id, package_name, credits, amount, currency, razorpay_order_id, razorpay_payment_id, status, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

    if (purchaseError) {
      console.error(
        "Payment history error:",
        purchaseError
      );

      setPurchaseHistory([]);
      return;
    }

    setPurchaseHistory(
      (data ?? []) as PurchaseHistoryItem[]
    );
  } catch (error) {
    console.error(
      "Payment history fetch error:",
      error
    );

    setPurchaseHistory([]);
  } finally {
    setPurchaseHistoryLoading(false);
  }
};
  // =========================================================
  // LOAD USER
  // =========================================================

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");
      // -------------------------------------------------------
      // PROFILE
      // -------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "username, full_name, credits"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(
          "Profile fetch error:",
          profileError
        );
      }

      const displayName =
        profile?.username ||
        profile?.full_name ||
        user.user_metadata?.user_name ||
        user.user_metadata?.username ||
        user.user_metadata?.preferred_username ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "Researcher";

      setUserName(displayName);
      setCredits(profile?.credits ?? 0);

      // -------------------------------------------------------
      // RESEARCH COUNT
      // -------------------------------------------------------

      const {
        count,
        error: researchCountError,
      } = await supabase
        .from("research_history")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id);

      if (researchCountError) {
        console.error(
          "Research count error:",
          researchCountError
        );
      }

      setResearchCount(count ?? 0);

      // -------------------------------------------------------
      // RECENT HISTORY
      // -------------------------------------------------------

      const {
        data: researchHistory,
        error: historyError,
      } = await supabase
        .from("research_history")
        .select(
          "id, query, executive_summary, key_findings, detailed_analysis, citations, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

      if (historyError) {
        console.error(
          "Research history error:",
          historyError
        );
      }

      setHistory(
        (researchHistory ?? []) as HistoryItem[]
      );
      await loadPurchaseHistory(user.id);
    };

    loadUser();
  }, [router]);

  // =========================================================
  // PROFILE MENU OUTSIDE CLICK
  // =========================================================

  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (
      event: MouseEvent
    ) => {
      const target =
        event.target as HTMLElement;

      if (
        !target.closest(
          "[data-profile-menu]"
        )
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [profileOpen]);

  // =========================================================
  // RESEARCH PROGRESS
  // =========================================================

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setProgressStep((current) => {
        if (
          current >=
          progressStages.length - 1
        ) {
          return current;
        }

        return current + 1;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [loading]);

  // =========================================================
  // START RESEARCH
  // =========================================================

  const startResearch = async () => {
    if (!query.trim()) {
      setError(
        "Please enter a research question."
      );
      return;
    }

    if (credits <= 0) {
      setError(
        "You don't have enough credits to run this research."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setProgressStep(0);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/research`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: query.trim(),
          }),
        }
      );

      if (!response.ok) {
        let message =
          "Research request failed.";

        try {
          const errorData =
            await response.json();

          if (
            typeof errorData?.detail ===
            "string"
          ) {
            message = errorData.detail;
          }
        } catch {
          // Ignore malformed error response.
        }

        throw new Error(message);
      }

      const data: ResearchResponse =
        await response.json();

      setProgressStep(
        progressStages.length
      );

      setResult(data);

      // -------------------------------------------------------
      // REFRESH CREDITS
      // -------------------------------------------------------

      const {
        data: updatedProfile,
      } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", session.user.id)
        .single();

      if (updatedProfile) {
        setCredits(
          updatedProfile.credits
        );
      }

      // -------------------------------------------------------
      // REFRESH COUNT
      // -------------------------------------------------------

      const {
        count,
      } = await supabase
        .from("research_history")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          session.user.id
        );

      setResearchCount(count ?? 0);

      // -------------------------------------------------------
      // REFRESH HISTORY
      // -------------------------------------------------------

      const {
        data: updatedHistory,
      } = await supabase
        .from("research_history")
        .select(
          "id, query, executive_summary, key_findings, detailed_analysis, citations, created_at"
        )
        .eq(
          "user_id",
          session.user.id
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

      setHistory(
        (updatedHistory ??
          []) as HistoryItem[]
      );
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "We couldn't complete the research.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // OPEN SAVED REPORT
  // =========================================================

  const openSavedReport = (
    item: HistoryItem
  ) => {
    setError("");

    const keyFindings =
      Array.isArray(item.key_findings)
        ? item.key_findings
        : [];

    const citations =
      Array.isArray(item.citations)
        ? item.citations
        : [];

    const report: ResearchReport = {
      query: item.query,
      executive_summary:
        item.executive_summary || "",
      key_findings: keyFindings,
      detailed_analysis:
        item.detailed_analysis || "",
      citations,
    };

    const savedResult: ResearchResponse = {
      query: item.query,
      status: "completed",
      message:
        "Saved research report loaded.",
      research_questions: [],
      sources: [],
      evidence: [],
      synthesis: {
        executive_summary:
          item.executive_summary || "",
        key_findings: keyFindings,
        detailed_analysis:
          item.detailed_analysis || "",
      },
      citations,
      report,
    };

    setResult(savedResult);
    setQuery(item.query);
    setProgressStep(
      progressStages.length
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // EXPORT REPORT
  // =========================================================

  const downloadReport = async (
    format: "pdf" | "markdown"
  ) => {
    if (!result?.report.query) return;

    setExporting(format);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/research/export/${format}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(
            result.report
          ),
        }
      );

      if (!response.ok) {
        let message =
          "Export failed.";

        try {
          const errorData =
            await response.json();

          if (
            typeof errorData?.detail ===
            "string"
          ) {
            message = errorData.detail;
          }
        } catch {
          // Ignore malformed response.
        }

        throw new Error(message);
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        format === "pdf"
          ? "research-report.pdf"
          : "research-report.md";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : `Couldn't export the ${format.toUpperCase()} report.`;

      setError(message);
    } finally {
      setExporting(null);
    }
  };

  // =========================================================
  // NEW RESEARCH
  // =========================================================

  const startNewResearch = () => {
    setResult(null);
    setQuery("");
    setError("");
    setProgressStep(0);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  };

  // =========================================================
// BUY CREDITS
// =========================================================

const openCreditPurchase = (
  packageItem: CreditPackage
) => {
  setSelectedPackage(packageItem);
  setPurchaseStatus(null);
  setError("");
  setBuyCreditsOpen(true);
};

// =========================================================
// RAZORPAY PURCHASE
// =========================================================

const handlePurchase = async () => {
  if (!selectedPackage) return;

  setPurchaseLoading(true);
  setPurchaseStatus(null);
  setError("");

  try {
    // -------------------------------------------------------
    // GET CURRENT USER SESSION
    // -------------------------------------------------------

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setPurchaseLoading(false);
      router.push("/login");
      return;
    }

    // -------------------------------------------------------
    // LOAD RAZORPAY CHECKOUT
    // -------------------------------------------------------

    const razorpayLoaded =
      await loadRazorpayScript();

    if (!razorpayLoaded) {
      throw new Error(
        "Razorpay Checkout could not be loaded. Please check your internet connection."
      );
    }

    // -------------------------------------------------------
    // CREATE PAYMENT ORDER
    // -------------------------------------------------------

    const orderResponse = await fetch(
      `${API_URL}/payments/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          package_id: selectedPackage.id,
        }),
      }
    );

    if (!orderResponse.ok) {
      let message =
        "Could not create payment order.";

      try {
        const errorData =
          await orderResponse.json();

        if (
          typeof errorData?.detail ===
          "string"
        ) {
          message = errorData.detail;
        }
      } catch {
        // Ignore malformed response.
      }

      throw new Error(message);
    }

    const order =
      await orderResponse.json();

    // -------------------------------------------------------
    // TRACK VERIFIED PAYMENT
    // -------------------------------------------------------

    let paymentVerified = false;

    // -------------------------------------------------------
    // RAZORPAY CHECKOUT OPTIONS
    // -------------------------------------------------------

    const options: RazorpayOptions = {
      key: order.key_id,

      amount: order.amount,

      currency: order.currency,

      name: "ResearchPilot AI",

      description:
        `${order.package_name} · ${order.credits} research credits`,

      order_id: order.order_id,

      prefill: {
        name: userName,
        email: userEmail,
      },

      theme: {
        color: "#2563eb",
      },

      modal: {
        ondismiss: () => {
          if (paymentVerified) return;

          setPurchaseLoading(false);
          setPurchaseStatus("cancelled");
        },
      },

      // -----------------------------------------------------
      // PAYMENT SUCCESS
      // -----------------------------------------------------

      handler: async (
        paymentResponse: RazorpayPaymentResponse
      ) => {
        try {
          setPurchaseLoading(true);
          setError("");

          // -------------------------------------------------
          // VERIFY PAYMENT ON BACKEND
          // -------------------------------------------------

          const verifyResponse =
            await fetch(
              `${API_URL}/payments/verify`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${session.access_token}`,
                },

                body: JSON.stringify({
                  razorpay_order_id:
                    paymentResponse.razorpay_order_id,

                  razorpay_payment_id:
                    paymentResponse.razorpay_payment_id,

                  razorpay_signature:
                    paymentResponse.razorpay_signature,
                }),
              }
            );

          let verification: {
            success?: boolean;
            already_processed?: boolean;
            credits_added?: number;
            credits?: number;
            payment_id?: string;
            order_id?: string;
          } = {};

          try {
            verification =
              await verifyResponse.json();
          } catch {
            // Ignore malformed response.
          }

          if (!verifyResponse.ok) {
            throw new Error(
              typeof verification === "object"
                ? "Payment verification failed."
                : "Payment verification failed."
            );
          }

          if (verification.success !== true) {
            throw new Error(
              "Payment could not be verified."
            );
          }

          // -------------------------------------------------
          // PAYMENT VERIFIED
          // -------------------------------------------------

          paymentVerified = true;

          // -------------------------------------------------
          // REFRESH CREDIT BALANCE FROM SUPABASE
          // -------------------------------------------------

          const {
            data: updatedProfile,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select("credits")
            .eq(
              "id",
              session.user.id
            )
            .single();

          if (
            profileError ||
            !updatedProfile
          ) {
            throw new Error(
              "Payment was successful, but the updated credit balance could not be loaded."
            );
          }

          setCredits(
  updatedProfile.credits
);

// -------------------------------------------------
// REFRESH PAYMENT HISTORY
// -------------------------------------------------

await loadPurchaseHistory(
  session.user.id
);

// -------------------------------------------------
// SUCCESS
// -------------------------------------------------

setPurchaseStatus("success");

        } catch (error) {
          console.error(
            "Payment verification error:",
            error
          );

          setPurchaseStatus("failed");

          setError(
            error instanceof Error
              ? error.message
              : "Payment verification failed."
          );
        } finally {
          setPurchaseLoading(false);
        }
      },
    };

    // -------------------------------------------------------
    // OPEN RAZORPAY
    // -------------------------------------------------------

    const razorpay =
      new window.Razorpay(options);

    razorpay.open();

  } catch (error) {
    console.error(
      "Payment error:",
      error
    );

    setPurchaseStatus("failed");

    setError(
      error instanceof Error
        ? error.message
        : "Could not start payment."
    );

    setPurchaseLoading(false);
  }
};

// =========================================================
// CANCEL PAYMENT
// =========================================================

const cancelPurchase = () => {
  if (purchaseLoading) return;

  setPurchaseLoading(false);
  setPurchaseStatus("cancelled");
};

// =========================================================
// CLOSE PAYMENT MODAL
// =========================================================

const closePurchaseModal = () => {
  if (purchaseLoading) return;

  setBuyCreditsOpen(false);
  setSelectedPackage(null);
  setPurchaseStatus(null);
  setError("");
};

// =========================================================
// PAYMENT SUCCESS
// =========================================================

const finishSuccessfulPurchase = () => {
  setBuyCreditsOpen(false);
  setSelectedPackage(null);
  setPurchaseStatus(null);
  setError("");
};

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f4f8ff] text-slate-900">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-7 lg:px-8">

          {/* LOGO */}

          <button
            type="button"
            onClick={startNewResearch}
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-[0_5px_15px_rgba(37,99,235,0.25)] transition group-hover:scale-105">
              RP
            </div>

            <div className="hidden text-left xs:block">
              <div className="text-[17px] font-bold tracking-tight text-[#173b67]">
                ResearchPilot{" "}
                <span className="text-blue-600">
                  AI
                </span>
              </div>

              <div className="text-[10px] font-medium text-slate-400">
                AI Research Workspace
              </div>
            </div>
          </button>

          {/* RIGHT SIDE */}

          <div className="flex items-center gap-2 sm:gap-3">

            {/* CREDIT BALANCE */}

            <button
              type="button"
              onClick={() =>
                setBuyCreditsOpen(true)
              }
              className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-2 transition hover:border-blue-200 hover:bg-blue-100 sm:px-3.5"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />

              <span className="text-[11px] font-bold text-blue-700 sm:text-xs">
                {credits}
                <span className="hidden sm:inline">
                  {" "}Credits
                </span>
              </span>
            </button>

            <div className="hidden h-7 w-px bg-slate-200 sm:block" />

            {/* PROFILE */}

            <div
              className="relative"
              data-profile-menu
            >
              <button
                type="button"
                onClick={() =>
                  setProfileOpen(
                    (current) => !current
                  )
                }
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-slate-50 sm:px-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {userName
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="hidden max-w-[130px] truncate text-xs font-semibold text-slate-600 sm:block">
                  {userName}
                </div>

                <svg
                  className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:block ${
                    profileOpen
                      ? "rotate-180"
                      : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(290px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">

                  {/* PROFILE HEADER */}

                  <div className="border-b border-slate-100 bg-[#f8fbff] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {userName
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#173b67]">
                          {userName}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {userEmail ||
                            "Researcher account"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">

                    {/* CREDITS */}

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(
                          false
                        );
                        setBuyCreditsOpen(
                          true
                        );
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm">
                          💳
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Research Credits
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {credits} credits
                            available
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-blue-600">
                        Buy
                      </span>
                    </button>

                    {/* SETTINGS */}

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(
                          false
                        );
                        router.push(
                          "/settings"
                        );
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-blue-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-sm">
                        ⚙️
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          Settings
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Research preferences
                        </p>
                      </div>
                    </button>

                    {/* PAYMENT HISTORY */}

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(
                          false
                        );
                        setBuyCreditsOpen(
                          true
                        );
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-sm">
                        📜
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          Billing & History
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Payments and credit usage
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* LOGOUT */}

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-sm">
                        🚪
                      </div>

                      <span>
                        Sign out
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          DASHBOARD
      ===================================================== */}

      {!result && !loading && (
        <section className="relative overflow-hidden px-4 pb-10 pt-6 sm:px-7 sm:pt-7 lg:px-8">

          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-200/20 blur-3xl" />

          <div className="pointer-events-none absolute -left-32 top-72 h-72 w-72 rounded-full bg-indigo-200/20 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">

            {/* HERO */}

            <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">

              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    AI Research Workspace
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-[-0.03em] text-[#173b67] sm:text-3xl lg:text-[35px]">
                  Good to see you,{" "}
                  <span className="text-blue-600">
                    {userName}
                  </span>{" "}
                  👋
                </h1>

                <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                  Turn complex questions into structured,
                  evidence-backed research with AI.
                </p>
              </div>

              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:block">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Your workspace
                </p>

                <p className="mt-1 text-sm font-semibold text-[#173b67]">
                  Ready for your next question
                </p>
              </div>
            </div>

            {/* =================================================
                RESEARCH CARD
            ================================================= */}

            <div className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_rgba(30,64,175,0.08)]">

              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

              <div className="p-4 sm:p-5 lg:p-6">

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        ✦
                      </div>

                      <div>
                        <h2 className="text-base font-bold text-[#173b67] sm:text-lg">
                          What do you want to research?
                        </h2>

                        <p className="text-xs text-slate-400">
                          Ask anything. ResearchPilot will investigate it.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-full bg-yellow-50 px-3 py-1.5 text-[10px] font-bold tracking-wide text-yellow-700">
                    SOURCED RESEARCH
                  </div>
                </div>

                {/* INPUT */}

                <div className="relative mt-5">
                  <textarea
                    value={query}
                    onChange={(event) =>
                      setQuery(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        (event.ctrlKey ||
                          event.metaKey) &&
                        event.key ===
                          "Enter"
                      ) {
                        startResearch();
                      }
                    }}
                    placeholder="e.g. What are the latest trends in generative AI?"
                    rows={4}
                    disabled={loading}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-70 sm:text-[15px]"
                  />

                  <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-md bg-white px-2 py-1 text-[9px] font-medium text-slate-400 shadow-sm sm:block">
                    Ctrl + Enter to research
                  </div>
                </div>

                {/* QUICK PROMPTS */}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {exampleQueries.map(
                    (example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() =>
                          setQuery(
                            example
                          )
                        }
                        disabled={loading}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                      >
                        {example}
                      </button>
                    )
                  )}
                </div>

                {/* FEATURES + BUTTON */}

                <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="flex flex-wrap gap-2">
                    <FeaturePill text="Web research" />
                    <FeaturePill text="Evidence analysis" />
                    <FeaturePill text="Citations" />
                    <FeaturePill text="AI synthesis" />
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">

                    <span className="text-center text-[10px] text-slate-400 sm:text-left">
                      Uses 1 research credit
                    </span>

                    <button
                      type="button"
                      onClick={
                        startResearch
                      }
                      disabled={
                        !query.trim() ||
                        credits <= 0 ||
                        loading
                      }
                      className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_18px_rgba(37,99,235,0.2)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:w-auto"
                    >
                      {credits <= 0
                        ? "No credits available"
                        : loading
                          ? "Researching..."
                          : "Research with AI →"}
                    </button>
                  </div>
                </div>

                {/* ERROR */}

                {error && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                    <span className="text-base">
                      ⚠️
                    </span>

                    <div>
                      <p className="font-semibold">
                        Something went wrong
                      </p>

                      <p className="mt-0.5">
                        {error}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =================================================
                STATS
            ================================================= */}

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">

              <StatCard
                title="Researches"
                value={String(
                  researchCount
                )}
                description="Completed research"
                icon="⌁"
              />

              <StatCard
                title="Credits"
                value={String(
                  credits
                )}
                description="Available research credits"
                icon="✦"
                accent="yellow"
              />

              <StatCard
                title="Reports"
                value={String(
                  researchCount
                )}
                description="Generated reports"
                icon="▤"
              />
            </div>

            {/* =================================================
                RECENT RESEARCH
            ================================================= */}

            <div className="mt-6">

              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#173b67]">
                    Recent Research
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Your latest research reports.
                  </p>
                </div>

                {history.length > 0 && (
                  <span className="hidden text-xs font-medium text-slate-400 sm:block">
                    Click a report to reopen
                  </span>
                )}
              </div>

              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-white/70 px-5 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                    ✦
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-[#173b67]">
                    Your research history is empty
                  </h3>

                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
                    Once you generate your first report,
                    saved research will appear here.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      document
                        .querySelector(
                          "textarea"
                        )
                        ?.focus()
                    }
                    className="mt-4 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Start your first research →
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map(
                    (item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          openSavedReport(
                            item
                          )
                        }
                        className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-bold text-[#173b67]">
                              {item.query}
                            </h3>

                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {item.executive_summary}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-600">
                                Saved report
                              </span>

                              <span className="text-[9px] text-slate-400">
                                {Array.isArray(
                                  item.citations
                                )
                                  ? item.citations
                                      .length
                                  : 0}{" "}
                                sources
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[10px] font-medium text-slate-400">
                              {new Date(
                                item.created_at
                              ).toLocaleDateString()}
                            </span>

                            <span className="text-blue-400 transition group-hover:translate-x-1">
                              →
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* =================================================
                CREDIT CTA
            ================================================= */}

            <div className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#173b67] to-blue-700 p-5 text-white shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      ✦
                    </span>

                    <p className="text-sm font-bold">
                      Need more research credits?
                    </p>
                  </div>

                  <p className="mt-1 max-w-xl text-xs leading-5 text-blue-100">
                    Choose a credit package and continue
                    researching without interruption.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBuyCreditsOpen(
                      true
                    )
                  }
                  className="shrink-0 rounded-xl bg-white px-5 py-3 text-xs font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Buy Credits →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <section className="relative min-h-[calc(100vh-68px)] px-4 py-10 sm:px-7 lg:px-8">
          <div className="mx-auto max-w-3xl">

            <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_20px_60px_rgba(30,64,175,0.08)] sm:p-8">

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">
                    ResearchPilot is working
                  </p>

                  <h2 className="mt-0.5 text-xl font-bold text-[#173b67]">
                    Building your research report
                  </h2>
                </div>
              </div>

              <div className="mt-7 space-y-1">
                {progressStages.map(
                  (stage, index) => (
                    <ProgressItem
                      key={stage}
                      number={String(
                        index + 1
                      ).padStart(2, "0")}
                      label={stage}
                      active={
                        progressStep >=
                        index
                      }
                      complete={
                        progressStep >
                        index
                      }
                    />
                  )
                )}
              </div>

              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-blue-50">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      ((progressStep + 1) /
                        progressStages.length) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                Searching, analyzing and synthesizing evidence...
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          REPORT
      ===================================================== */}

      {result && !loading && (
        <section className="px-4 py-7 sm:px-7 sm:py-9 lg:px-8">
          <div className="mx-auto max-w-6xl">

            {/* TOP BAR */}

            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <button
                type="button"
                onClick={startNewResearch}
                className="text-left text-sm font-semibold text-blue-600 transition hover:text-blue-700"
              >
                ← Back to dashboard
              </button>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={() =>
                    downloadReport(
                      "markdown"
                    )
                  }
                  disabled={
                    exporting !== null
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                >
                  {exporting ===
                  "markdown"
                    ? "Exporting..."
                    : "↓ Markdown"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadReport(
                      "pdf"
                    )
                  }
                  disabled={
                    exporting !== null
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {exporting ===
                  "pdf"
                    ? "Exporting..."
                    : "↓ PDF"}
                </button>
              </div>
            </div>

            {/* SAVED REPORT */}

            <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold">
                ✓
              </span>

              <span>
                This report is saved to your research history.
                You can reopen and export it anytime without
                using another credit.
              </span>
            </div>

            {/* ERROR */}

            {error && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* REPORT */}

            <article className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm sm:p-8">

              {/* HEADER */}

              <header className="border-b border-slate-100 pb-6">

                <span className="inline-flex rounded-full bg-yellow-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-700">
                  Research Report
                </span>

                <h2 className="mt-3 max-w-5xl text-2xl font-bold leading-tight text-[#173b67] sm:text-3xl">
                  {result.report.query}
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                    {result.report.citations.length}{" "}
                    sources
                  </span>

                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    Evidence-backed
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                    Saved
                  </span>
                </div>
              </header>

              {/* EXECUTIVE SUMMARY */}

              <section className="border-b border-slate-100 py-7">
                <h3 className="text-lg font-bold text-[#173b67]">
                  Executive Summary
                </h3>

                <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                  {
                    result.report
                      .executive_summary
                  }
                </p>
              </section>

              {/* KEY FINDINGS */}

              <section className="border-b border-slate-100 py-7">
                <h3 className="text-lg font-bold text-[#173b67]">
                  Key Findings
                </h3>

                <div className="mt-4 grid gap-2.5">
                  {result.report.key_findings.map(
                    (
                      finding,
                      index
                    ) => (
                      <div
                        key={index}
                        className="flex gap-3 rounded-xl border border-blue-50 bg-[#f7faff] p-3.5"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                          {index + 1}
                        </span>

                        <p className="text-sm leading-6 text-slate-600">
                          {finding}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/* DETAILED ANALYSIS */}

              <section className="border-b border-slate-100 py-7">

                <h3 className="text-lg font-bold text-[#173b67]">
                  Detailed Analysis
                </h3>

                <div className="mt-4 max-w-5xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">

                  <ReactMarkdown
                    components={{
                      h1: ({
                        children,
                      }) => (
                        <h1 className="mb-4 mt-6 text-2xl font-bold text-[#173b67]">
                          {children}
                        </h1>
                      ),

                      h2: ({
                        children,
                      }) => (
                        <h2 className="mb-3 mt-6 text-xl font-bold text-[#173b67]">
                          {children}
                        </h2>
                      ),

                      h3: ({
                        children,
                      }) => (
                        <h3 className="mb-2 mt-5 text-lg font-bold text-[#173b67]">
                          {children}
                        </h3>
                      ),

                      p: ({
                        children,
                      }) => (
                        <p className="mb-4 leading-7 text-slate-600 sm:leading-8">
                          {children}
                        </p>
                      ),

                      strong: ({
                        children,
                      }) => (
                        <strong className="font-semibold text-[#173b67]">
                          {children}
                        </strong>
                      ),

                      ul: ({
                        children,
                      }) => (
                        <ul className="mb-4 ml-5 list-disc space-y-2">
                          {children}
                        </ul>
                      ),

                      ol: ({
                        children,
                      }) => (
                        <ol className="mb-4 ml-5 list-decimal space-y-2">
                          {children}
                        </ol>
                      ),

                      li: ({
                        children,
                      }) => (
                        <li className="pl-1 leading-7">
                          {children}
                        </li>
                      ),
                    }}
                  >
                    {
                      result.report
                        .detailed_analysis
                    }
                  </ReactMarkdown>
                </div>
              </section>

              {/* SOURCES */}

              <section className="pt-7">

                <h3 className="text-lg font-bold text-[#173b67]">
                  Sources & Citations
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Sources used to build this research report.
                </p>

                {result.report.citations
                  .length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-400">
                    No citations were saved with this report.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2.5">
                    {result.report.citations.map(
                      (citation) => (
                        <a
                          key={
                            citation.id
                          }
                          href={
                            citation.url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-blue-200 hover:bg-blue-50"
                        >
                          <div className="flex gap-3">

                            <span className="font-semibold text-blue-600">
                              [
                              {
                                citation.id
                              }
                              ]
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                                {
                                  citation.title
                                }
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-400">
                                {
                                  citation.url
                                }
                              </p>
                            </div>

                            <span className="text-slate-300 transition group-hover:text-blue-500">
                              ↗
                            </span>
                          </div>
                        </a>
                      )
                    )}
                  </div>
                )}
              </section>
            </article>
          </div>
        </section>
      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-[10px] text-slate-400">
        <p>
          ResearchPilot AI · Agentic Research Assistant
        </p>

        <p className="mt-1">
          Evidence-backed research with transparent citations.
        </p>
      </footer>

      {/* =====================================================
          CREDIT PURCHASE MODAL
      ===================================================== */}

      {buyCreditsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePurchaseModal();
            }
          }}
        >
          <div className="my-6 w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.25)]">

            {/* MODAL HEADER */}

            <div className="border-b border-slate-100 bg-[#f8fbff] px-5 py-5 sm:px-7">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    Credits
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-[#173b67] sm:text-2xl">
                    Power your next research
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Choose a credit package for your ResearchPilot workspace.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closePurchaseModal
                  }
                  disabled={
                    purchaseLoading
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-7">

              {/* PURCHASE SUCCESS */}

              {purchaseStatus ===
              "success" ? (
                <PurchaseSuccess
                  packageItem={
                    selectedPackage
                  }
                  onDone={
                    finishSuccessfulPurchase
                  }
                />
              ) : purchaseStatus ===
                "failed" ? (
                <PurchaseFailed
                  onRetry={() => {
                    setPurchaseStatus(
                      null
                    );
                  }}
                  onCancel={
                    closePurchaseModal
                  }
                />
              ) : purchaseStatus ===
                "cancelled" ? (
                <PurchaseCancelled
                  onRetry={() => {
                    setPurchaseStatus(
                      null
                    );
                  }}
                  onClose={
                    closePurchaseModal
                  }
                />
              ) : (
                <>
                  {/* CURRENT BALANCE */}

                  <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                        💳
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                          Current balance
                        </p>

                        <p className="mt-0.5 text-lg font-bold text-[#173b67]">
                          {credits} credits
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium text-slate-400">
                      1 research = 1 credit
                    </span>
                  </div>

                  {/* PACKAGES */}

                  <div className="grid gap-3 md:grid-cols-3">
                    {CREDIT_PACKAGES.map(
                      (packageItem) => {
                        const selected =
                          selectedPackage?.id ===
                          packageItem.id;

                        return (
                          <button
                            key={
                              packageItem.id
                            }
                            type="button"
                            onClick={() =>
                              setSelectedPackage(
                                packageItem
                              )
                            }
                            className={`relative text-left rounded-2xl border p-5 transition ${
                              selected
                                ? "border-blue-500 bg-blue-50/60 shadow-[0_8px_25px_rgba(37,99,235,0.10)]"
                                : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                            }`}
                          >
                            {packageItem.popular && (
                              <span className="absolute -top-2.5 left-4 rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                                Popular
                              </span>
                            )}

                            <div className="flex items-start justify-between gap-3">

                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  {
                                    packageItem.name
                                  }
                                </p>

                                <p className="mt-2 text-2xl font-bold text-[#173b67]">
                                  {
                                    packageItem.credits
                                  }
                                </p>

                                <p className="text-xs font-semibold text-blue-600">
                                  research credits
                                </p>
                              </div>

                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {selected
                                  ? "✓"
                                  : ""}
                              </div>
                            </div>

                            <div className="mt-5 border-t border-slate-100 pt-4">

                              <p className="text-xl font-bold text-[#173b67]">
                                ₹
                                {
                                  packageItem.price
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">
                                {
                                  packageItem.description
                                }
                              </p>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* SELECTED PACKAGE */}

                  {selectedPackage && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>
                          <p className="text-xs font-bold text-[#173b67]">
                            {
                              selectedPackage.name
                            }{" "}
                            package
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {
                              selectedPackage.credits
                            } credits · ₹
                            {
                              selectedPackage.price
                            }
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            handlePurchase
                          }
                          disabled={
                            purchaseLoading
                          }
                          className="w-full rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                        >
                          {purchaseLoading
                            ? "Opening secure checkout..."
                            : `Buy ${selectedPackage.credits} Credits`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SECURE PAYMENT */}

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">

                    <SecurePaymentItem
                      icon="🔒"
                      title="Secure checkout"
                      text="Payment data is handled by the payment provider."
                    />

                    <SecurePaymentItem
                      icon="🛡️"
                      title="Protected payment"
                      text="Your card or UPI details are not stored by this page."
                    />

                    <SecurePaymentItem
                      icon="⚡"
                      title="Instant credits"
                      text="Credits will be added after verified payment."
                    />
                  </div>

                 {/* =====================================================
    PAYMENT HISTORY
===================================================== */}

<div className="mt-6 border-t border-slate-100 pt-5">

  <div className="flex items-center justify-between gap-3">

    <div>
      <h3 className="text-sm font-bold text-[#173b67]">
        Payment History
      </h3>

      <p className="mt-0.5 text-[10px] text-slate-400">
        Your recent credit purchases.
      </p>
    </div>

    {purchaseHistory.length > 0 && (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-600">
        {purchaseHistory.length}{" "}
        {purchaseHistory.length === 1
          ? "transaction"
          : "transactions"}
      </span>
    )}
  </div>

  {/* LOADING */}

  {purchaseHistoryLoading ? (
    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">

      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>

      <p className="mt-2 text-xs font-medium text-slate-500">
        Loading payment history...
      </p>
    </div>

  ) : purchaseHistory.length === 0 ? (

    /* EMPTY STATE */

    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">

      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
        📜
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-600">
        No payment transactions yet.
      </p>

      <p className="mt-1 text-[10px] leading-4 text-slate-400">
        Your credit purchases will appear here after
        successful payment.
      </p>
    </div>

  ) : (

    /* TRANSACTION LIST */

    <div className="mt-3 space-y-2.5">

      {purchaseHistory.map(
        (purchase) => {

          const isPaid =
            purchase.status === "paid";

          const isFailed =
            purchase.status === "failed";

          const amountInRupees =
            purchase.amount / 100;

          const formattedDate =
            new Date(
              purchase.created_at
            ).toLocaleString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );

          return (
            <div
              key={purchase.id}
              className="rounded-xl border border-slate-100 bg-white p-3.5 transition hover:border-blue-100 hover:bg-blue-50/20"
            >

              {/* TOP ROW */}

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <p className="text-xs font-bold text-[#173b67]">
                      {purchase.package_name}
                    </p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-600"
                          : isFailed
                            ? "bg-red-50 text-red-600"
                            : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {isPaid
                        ? "Paid"
                        : isFailed
                          ? "Failed"
                          : purchase.status}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-slate-400">
                    {formattedDate}
                  </p>
                </div>

                <div className="shrink-0 text-right">

                  <p className="text-sm font-bold text-[#173b67]">
                    ₹
                    {amountInRupees.toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </p>

                  <p className="mt-0.5 text-[9px] font-medium text-blue-600">
                    +{purchase.credits} credits
                  </p>
                </div>
              </div>

              {/* TRANSACTION DETAILS */}

              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">

                <div>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                    Order ID
                  </p>

                  <p
                    className="mt-0.5 truncate text-[9px] font-medium text-slate-500"
                    title={
                      purchase.razorpay_order_id ||
                      "Not available"
                    }
                  >
                    {purchase.razorpay_order_id ||
                      "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                    Payment ID
                  </p>

                  <p
                    className="mt-0.5 truncate text-[9px] font-medium text-slate-500"
                    title={
                      purchase.razorpay_payment_id ||
                      "Not available"
                    }
                  >
                    {purchase.razorpay_payment_id ||
                      "Not available"}
                  </p>
                </div>

              </div>
            </div>
          );
        }
      )}
    </div>
  )}

</div>

                  {/* DEMO NOTICE */}

                  <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[10px] leading-5 text-blue-700">
  <strong>Test Mode:</strong>{" "}
  Payments are processed through Razorpay Test Mode.
  No real money will be charged.
</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   FEATURE PILL
========================================================= */

function FeaturePill({
  text,
}: {
  text: string;
}) {
  return (
    <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-slate-500">
      <span className="mr-1 text-emerald-500">
        ✓
      </span>

      {text}
    </span>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  description,
  icon,
  accent = "blue",
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  accent?: "blue" | "yellow";
}) {
  const iconStyle =
    accent === "yellow"
      ? "bg-yellow-50 text-yellow-700"
      : "bg-blue-50 text-blue-700";

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <div className="flex items-start justify-between">

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-0.5 text-xl font-bold tracking-tight text-[#173b67]">
            {value}
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${iconStyle}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PROGRESS ITEM
========================================================= */

function ProgressItem({
  number,
  label,
  active,
  complete,
}: {
  number: string;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${
        active
          ? "bg-[#f7faff]"
          : "bg-white"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-500 ${
          complete
            ? "bg-blue-600 text-white"
            : active
              ? "border-2 border-blue-500 bg-blue-50 text-blue-600"
              : "border border-slate-200 bg-slate-50 text-slate-400"
        }`}
      >
        {complete ? "✓" : number}
      </div>

      <p
        className={`flex-1 text-xs transition-colors sm:text-sm ${
          active
            ? "font-semibold text-[#173b67]"
            : "font-medium text-slate-400"
        }`}
      >
        {label}
      </p>

      {active && !complete && (
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SECURE PAYMENT ITEM
========================================================= */

function SecurePaymentItem({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {icon}
        </span>

        <p className="text-[10px] font-bold text-slate-700">
          {title}
        </p>
      </div>

      <p className="mt-1.5 text-[9px] leading-4 text-slate-400">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   PURCHASE SUCCESS
========================================================= */

function PurchaseSuccess({
  packageItem,
  onDone,
}: {
  packageItem:
    | CreditPackage
    | null;
  onDone: () => void;
}) {
  return (
    <div className="py-8 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
        ✓
      </div>

      <h2 className="mt-5 text-xl font-bold text-[#173b67]">
        Purchase successful
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
       Your payment was verified successfully and your
research credits have been added to your account.
      </p>

      {packageItem && (
        <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">

          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
            Purchased package
          </p>

          <p className="mt-2 text-2xl font-bold text-[#173b67]">
            +{packageItem.credits}
          </p>

          <p className="text-xs font-semibold text-emerald-700">
            research credits
          </p>

          <p className="mt-2 text-[10px] text-slate-400">
            ₹{packageItem.price} ·{" "}
            {packageItem.name}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-blue-700"
      >
        Continue to Research
      </button>

      <p className="mt-4 text-[10px] text-slate-400">
        A transaction confirmation email will be sent to your
registered account email.
      </p>
    </div>
  );
}

/* =========================================================
   PURCHASE FAILED
========================================================= */

function PurchaseFailed({
  onRetry,
  onCancel,
}: {
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="py-8 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
        ✕
      </div>

      <h2 className="mt-5 text-xl font-bold text-[#173b67]">
        Payment failed
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        The payment could not be completed. No credits were added
        to your account.
      </p>

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">

        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          Try Again
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   PURCHASE CANCELLED
========================================================= */

function PurchaseCancelled({
  onRetry,
  onClose,
}: {
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="py-8 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-500">
        →
      </div>

      <h2 className="mt-5 text-xl font-bold text-[#173b67]">
        Payment cancelled
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        The checkout was cancelled. Your current credit balance
        remains unchanged.
      </p>

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">

        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          Choose a Package
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}