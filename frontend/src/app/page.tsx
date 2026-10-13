"use client";

import { useState } from "react";
import { ReportDashboard, VisualReport } from "@/components/ReportDashboard";

interface ResearchResponse {
  query: string;
  status: string;
  logs: string[];
  report: VisualReport; // Types the JSON payload directly to VisualReport
  cached: boolean;      // Fixed TypeScript syntax: bool -> boolean
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, force_refresh: false }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to fetch research report.");
      }

      const data = await response.json();

      // Safety check: Handles whether your API returns `data.report` or `data.final_report`
      const reportPayload = data.report || data.final_report;

      setResult({
        ...data,
        report: reportPayload,
      });
    } catch (err: any) {
      setError(err.message || "An error occurred while connecting to the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 p-6 md:p-12">
      <main className="max-w-5xl mx-auto w-full flex flex-col gap-8">

        {/* Header Section */}
        <div className="flex flex-col gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">DeepSearch AI Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Multi-Agent Evidence-Grounded Research & Structured Visualization System
          </p>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your research query (e.g., Quantum Computing advances 2026)..."
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors min-w-[140px] flex items-center justify-center"
          >
            {loading ? "Researching..." : "Start Research"}
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-zinc-500 animate-pulse">
              Agents are investigating, validating, and compiling your report...
            </p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="flex flex-col gap-6">

            {/* Agent Execution Logs */}
            {result.logs && result.logs.length > 0 && (
              <div className="flex flex-col gap-2 bg-zinc-900 text-zinc-200 p-4 rounded-xl font-mono text-xs max-h-48 overflow-y-auto border border-zinc-800 shadow-inner">
                <span className="text-zinc-500 font-bold">Execution Logs:</span>
                {result.logs.map((log, index) => (
                  <div key={index} className="text-zinc-300">{log}</div>
                ))}
              </div>
            )}

            {/* Formatted Interactive Visual Report Dashboard */}
            {result.report && (
              <ReportDashboard report={result.report} cached={result.cached} />
            )}

          </div>
        )}

      </main>
    </div>
  );
}