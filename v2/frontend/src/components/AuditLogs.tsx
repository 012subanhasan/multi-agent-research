'use client';

import React from 'react';
import { Terminal, CheckCircle2, Loader2, Search, Brain, Palette } from 'lucide-react';

interface AuditLogsProps {
  logs: string[];
  status: string;
  isLoading: boolean;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ logs, status, isLoading }) => {
  if (!isLoading && logs.length === 0) return null;

  // Determine current active node from logs or status
  const currentLog = logs.length > 0 ? logs[logs.length - 1] : '';
  const isResearcher = currentLog.includes('[Researcher]') || status === 'started';
  const isAnalyst = currentLog.includes('[Analyst]') || status === 'research_completed';
  const isDesigner = currentLog.includes('[Designer]') || status === 'analysis_completed';
  const isFinished = status === 'completed' && !isLoading;

  return (
    <div className="w-full glass-panel p-5 rounded-2xl border border-slate-800/80 my-6">
      {/* Pipeline Stage Tracker */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200">LangGraph Pipeline Execution Stream</h3>
        </div>

        {/* Node Progress Pills */}
        <div className="flex items-center gap-2">
          {/* Researcher */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              isFinished || isAnalyst || isDesigner
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isResearcher
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {isFinished || isAnalyst || isDesigner ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : isResearcher ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Researcher</span>
          </div>

          {/* Analyst */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              isFinished || isDesigner
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isAnalyst
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 animate-pulse'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {isFinished || isDesigner ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : isAnalyst ? (
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            ) : (
              <Brain className="w-3.5 h-3.5" />
            )}
            <span>Analyst (Groq LLM)</span>
          </div>

          {/* Designer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              isFinished
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isDesigner
                ? 'bg-pink-500/15 text-pink-300 border-pink-500/40 animate-pulse'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {isFinished ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : isDesigner ? (
              <Loader2 className="w-3.5 h-3.5 text-pink-400 animate-spin" />
            ) : (
              <Palette className="w-3.5 h-3.5" />
            )}
            <span>Designer</span>
          </div>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="h-44 overflow-y-auto font-mono text-xs p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-slate-300 space-y-1.5 shadow-inner">
        {logs.map((log, idx) => {
          let badgeColor = 'text-slate-400';
          if (log.includes('[Researcher]')) badgeColor = 'text-amber-400';
          if (log.includes('[Analyst]')) badgeColor = 'text-purple-400';
          if (log.includes('[Designer]')) badgeColor = 'text-pink-400';
          if (log.includes('[Cache]') || log.includes('[System]')) badgeColor = 'text-indigo-400';

          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-600 text-[10px] select-none">{String(idx + 1).padStart(2, '0')}</span>
              <span className={badgeColor}>{log}</span>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-center gap-2 text-indigo-400 pt-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Agent graph executing next turn...</span>
          </div>
        )}
      </div>
    </div>
  );
};
