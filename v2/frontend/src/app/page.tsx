"use client";

import React, { useState, useEffect, useRef } from "react";
import { ReportDashboard, VisualReport } from "@/components/ReportDashboard";
import { Sparkles, Search, Loader2, CheckCircle2, Globe, BookOpen, Network, BrainCircuit, ArrowRight, Layers, Clock, Zap } from "lucide-react";

interface ResearchResponse {
  query: string;
  status: string;
  logs: string[];
  report: VisualReport;
  cached: boolean;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [chaptersCount, setChaptersCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState("");

  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [displayedLogs, setDisplayedLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Live Estimates
  const estimatedTimeSeconds = chaptersCount * 5; // ~5 seconds per chapter
  const estimatedTokens = chaptersCount * 1100; // ~1100 tokens per chapter
  const isHighTokenWarning = estimatedTokens > 10000;

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedLogs]);

  // Smooth typing queue effect for cognitive thinking stream
  useEffect(() => {
    if (displayedLogs.length < backendLogs.length) {
      const timer = setTimeout(() => {
        const nextIndex = displayedLogs.length;
        setDisplayedLogs((prev) => [...prev, backendLogs[nextIndex]]);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [backendLogs, displayedLogs]);

  const getCurrentStage = () => {
    const latestLog = displayedLogs[displayedLogs.length - 1] || '';
    if (latestLog.includes('[Designer]')) return 3;
    if (latestLog.includes('[Analyst]')) return 2;
    if (latestLog.includes('[Researcher]') || latestLog.includes('Cognitive') || latestLog.includes('Intent') || latestLog.includes('Search') || latestLog.includes('Analyst Cognitive Review')) return 1;
    return 0;
  };

  const currentStage = getCurrentStage();

  const stages = [
    { title: 'Cognitive Parsing & Query Optimization', icon: Search, desc: 'Deconstructing user intent and extracting vectors' },
    { title: 'Multi-Vector Web Intelligence Scan', icon: Globe, desc: 'Ingesting and filtering high-signal research sources' },
    { title: 'Architectural Taxonomy & Planning', icon: BookOpen, desc: 'Analyst formulating chapter dependency tree' },
    { title: 'Neural Synthesis & Mermaid Topology', icon: Network, desc: 'Generating technical prose and structural diagrams' },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);
    setBackendLogs([`🧠 [Cognitive Engine] Initializing neural research pipeline for: '${query}' (${chaptersCount} chapters requested)`]);
    setDisplayedLogs([]);

    try {
      const response = await fetch("http://localhost:8000/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chapters_count: chaptersCount }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to research pipeline stream.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Readable stream not supported.");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.logs && Array.isArray(data.logs)) {
                setBackendLogs(data.logs);
              }

              if (data.status === "completed") {
                // Fetch full report from backend API cleanly to avoid SSE payload truncation
                const reportRes = await fetch(`http://localhost:8000/api/report?query=${encodeURIComponent(query)}`);
                if (reportRes.ok) {
                  const reportJson = await reportRes.json();
                  setResult({
                    query,
                    status: "completed",
                    logs: data.logs,
                    report: reportJson.report,
                    cached: reportJson.cached || data.cached || false,
                  });
                } else {
                  throw new Error("Failed to fetch completed report from backend cache.");
                }
              }
            } catch (parseErr) {
              console.warn("Skipping malformed chunk:", parseErr);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while connecting to the backend.");
    } finally {
      setLoading(false);
    }
  };

  if (result && result.report) {
    return <ReportDashboard report={result.report} cached={result.cached} onReset={() => setResult(null)} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12 selection:bg-indigo-500 selection:text-white items-center justify-center">
      <main className="max-w-4xl w-full flex flex-col gap-8">

        {/* Header Section */}
        <div className="flex flex-col items-center text-center gap-3 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            Enterprise Multi-Agent Research System
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">DeepSearch AI Dashboard</h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl">
            Multi-Agent Evidence-Grounded Research & Structured Visualization System
          </p>
        </div>

        {/* Search Input Form & Chapter Selector */}
        <form onSubmit={handleSearch} className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your research query (e.g., Quantum Computing advances 2026)..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
                disabled={loading}
                suppressHydrationWarning
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  Start Research
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Chapter Selector (1 to 10) & Live Metrics */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 flex items-center gap-1 font-semibold mr-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Chapters:
              </span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setChaptersCount(num)}
                  disabled={loading}
                  className={`w-7 h-7 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${chaptersCount === num
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-500/40'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Live Metrics: ETA & Token Estimate */}
            <div className="flex items-center gap-4 font-mono text-[11px] text-slate-300">
              <span className="flex items-center gap-1 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                ETA: ~{estimatedTimeSeconds}s
              </span>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md border ${isHighTokenWarning ? 'bg-amber-950/30 text-amber-300 border-amber-500/30' : 'bg-slate-950/60 text-slate-300 border-slate-800'}`}>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                ~{estimatedTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Immersive AI Cognitive State & Thinking Stream */}
        {loading && (
          <div className="space-y-6 animate-fadeIn">
            {/* Step Progression Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stages.map((stage, idx) => {
                const isCompleted = currentStage > idx;
                const isCurrent = currentStage === idx;
                const Icon = stage.icon;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${isCurrent
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                        : isCompleted
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-900/40 border-slate-800/80 opacity-50'
                      }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isCurrent
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 animate-pulse'
                          : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white tracking-wide">{stage.title}</h4>
                        {isCurrent && <span className="text-[10px] font-mono text-indigo-400 animate-pulse font-semibold">COGNIZING</span>}
                        {isCompleted && <span className="text-[10px] font-mono text-emerald-400 font-semibold">RESOLVED</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Cognitive Thought Stream Terminal */}
            <div className="p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                  <BrainCircuit className="w-4 h-4 animate-pulse text-indigo-400" />
                  <span>AI Cognitive Thought Stream</span>
                </div>
                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  Reasoning Active
                </span>
              </div>
              <div className="h-44 overflow-y-auto space-y-2 text-slate-300 pr-2">
                {displayedLogs.map((log, index) => (
                  <div key={index} className="opacity-95 leading-relaxed text-[11px] flex items-start gap-2 animate-fadeIn">
                    <span className="text-indigo-400 font-bold select-none">✦</span>
                    <span className={log.includes('⚠️') ? 'text-amber-300' : log.includes('✅') || log.includes('✨') ? 'text-emerald-300' : 'text-slate-300'}>
                      {log}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}