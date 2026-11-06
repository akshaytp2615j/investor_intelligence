/**
 * ============================================================================
 * SIDEBAR NAVIGATION COMPONENT - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
 * ============================================================================
 * Renders the vertical sidebar navigation matching the dark fintech theme.
 * Allows quick tab switching between Dashboard, Companies & Trends, Ingest Reports,
 * and AI Assistant.
 * ============================================================================
 */

import React from 'react';
import { LayoutDashboard, BarChart3, FileText, Bot, UploadCloud, Cpu } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, setIsUploadModalOpen }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'compare', label: 'Companies & Trends', icon: BarChart3 },
    { id: 'reports', label: 'Reports Ingestion', icon: FileText },
    { id: 'assistant', label: 'AI Assistant', icon: Bot },
  ];

  return (
    <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Platform Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight leading-none">AaiTech</h1>
            <p className="text-[11px] text-cyan-400 font-medium tracking-wider uppercase mt-1">Investor Intelligence</p>
          </div>
        </div>

        {/* Quick Ingest Card (Matching Reference Screenshot 1 & 2) */}
        <div className="p-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-center hover:border-cyan-500/40 transition-all group">
            <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto mb-2 text-cyan-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-semibold text-slate-200">Ingest Report</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Drag & drop or browse PDF</p>
            <button
              onClick={() => setActiveTab('reports')}
              className="mt-3 w-full py-1.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs rounded-lg transition-all shadow-md shadow-cyan-500/20"
            >
              Upload Annual Report
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Channel / System Info */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>FastAPI + ChromaDB</span>
          </div>
          <p className="text-[11px] text-slate-400">PyMuPDF4LLM & BGE Embeddings active</p>
        </div>
      </div>
    </aside>
  );
}
