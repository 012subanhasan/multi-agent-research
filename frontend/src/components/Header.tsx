'use client';

import React from 'react';
import { Cpu, Zap, Database, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  forceRefresh: boolean;
  setForceRefresh: (val: boolean) => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ forceRefresh, setForceRefresh, isLoading }) => {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                DeepSearch <span className="gradient-text">AI</span>
              </h1>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-Agent Research Pipeline Powered by Groq Cloud</p>
          </div>
        </div>

        {/* System Badges & Controls */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Groq Engine Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Groq Cloud: <strong className="text-slate-100">qwen/qwen3.8-27b</strong></span>
          </div>

          {/* LangGraph Architecture Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Agent Graph: <strong className="text-indigo-300">LangGraph</strong></span>
          </div>

          {/* Cache Bypass Toggle */}
          <button
            onClick={() => setForceRefresh(!forceRefresh)}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              forceRefresh
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm shadow-purple-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Bypass MongoDB cache and force fresh web search"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${forceRefresh ? 'text-purple-400 animate-spin-slow' : ''}`} />
            <span>Force Fresh Search</span>
            <span className={`w-2 h-2 rounded-full ${forceRefresh ? 'bg-purple-400' : 'bg-slate-600'}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
