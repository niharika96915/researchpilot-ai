"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState("Connecting...");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/health");

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();

        setBackendStatus(data.status);
      } catch (err) {
        console.error(err);
        setError("Could not connect to the backend.");
      }
    };

    checkBackend();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          ResearchPilot AI
        </h1>

        <p className="text-gray-400 mb-6">
          Agentic AI Research Assistant
        </p>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400 mb-2">
            Backend Status
          </p>

          {error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <p className="text-green-400 font-semibold">
              ● {backendStatus}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}