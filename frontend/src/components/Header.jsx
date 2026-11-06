/**
 * ============================================================================
 * HEADER COMPONENT - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
 * ============================================================================
 * Platform header displaying title, subtitle, live status indicators,
 * and quick toggle button for the AI Analyst slide-out panel.
 * ============================================================================
 */

import React from 'react';
import { Bot, Sparkles, RefreshCw } from 'lucide-react';

export default function Header({ isChatOpen, setIsChatOpen, onRefreshData }) {
  return (
    <header className="h-20 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Tagline (Matching Screenshot 1) */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>AI–Powered Investor Intelligence Platform</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">
          Real-time corporate insights and KPI extraction
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Refresh Data Button */}
        <button
          onClick={onRefreshData}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition-all"
          title="Refresh Financial Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* AI Analyst Slide-out Toggle (Matching Screenshot 1 & 3) */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center space-x-2 transition-all shadow-lg ${
            isChatOpen
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-cyan-500/30'
              : 'bg-slate-900 border border-cyan-500/40 text-cyan-400 hover:bg-slate-800 shadow-cyan-500/10'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Analyst</span>
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
        </button>
      </div>
    </header>
  );
}
