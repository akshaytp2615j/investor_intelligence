/**
 * ============================================================================
 * MAIN DASHBOARD COMPONENT - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
 * ============================================================================
 * Displays:
 * 1. 6 Major Financial KPI Cards comparing companies with comparative progress bars
 *    (Revenue, Net Income, Operating Income, Operating Cash Flow, Total Assets, Total Liabilities)
 * 2. Qualitative Intelligence Deep-Dive section for selected company
 *    (Top Growth Drivers & Top Risk Factors)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  DollarSign, TrendingUp, Activity, CreditCard, Landmark, ShieldAlert,
  CheckCircle2, AlertTriangle, ChevronDown, Layers
} from 'lucide-react';

export default function Dashboard({ kpiSummary, companiesList, loading, onRefresh }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(1);
  const [companies, setCompanies] = useState([
    { id: 1, name: 'Apple', ticker: 'AAPL', full_name: 'Apple Inc.' },
    { id: 2, name: 'Microsoft', ticker: 'MSFT', full_name: 'Microsoft Corporation' },
    { id: 3, name: 'Tesla', ticker: 'TSLA', full_name: 'Tesla, Inc.' }
  ]);
  const [qualitative, setQualitative] = useState({
    growth_drivers: [],
    risk_factors: []
  });

  const formatCompanyName = (rawName) => {
    if (!rawName) return 'Unknown Company';
    // Strip trailing 4-digit fiscal years e.g., "samsung 2025" -> "samsung"
    let clean = rawName.replace(/\b(20[1-2][0-9])\b/g, '').trim();
    clean = clean.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) clean = rawName;
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  // Sync companies from prop when available
  useEffect(() => {
    if (companiesList && companiesList.length > 0) {
      const formatted = companiesList.map(c => {
        const full = formatCompanyName(c.name);
        return {
          id: c.id,
          name: full.split(' ')[0],
          ticker: c.ticker,
          full_name: full
        };
      });
      setCompanies(formatted);
      // Ensure selected company ID points to a valid active company
      if (!formatted.some(c => c.id === Number(selectedCompanyId))) {
        setSelectedCompanyId(formatted[0].id);
      }
    } else {
      setCompanies([]);
      setSelectedCompanyId(null);
    }
  }, [companiesList]);

  // Fetch qualitative deep-dive when selected company changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchQualitativeData(selectedCompanyId);
    } else {
      setQualitative({ growth_drivers: [], risk_factors: [] });
    }
  }, [selectedCompanyId]);

  const fetchQualitativeData = async (compId) => {
    try {
      const res = await axios.get(`/qualitative/${compId}/2024`);
      if (res.data && res.data.growth_drivers) {
        setQualitative(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch qualitative data:", err);
    }
  };

  const selectedCompanyObj = companies.find(c => c.id === Number(selectedCompanyId)) || companies[0] || {
    id: 0,
    name: 'N/A',
    ticker: 'N/A',
    full_name: 'No Active Companies'
  };

  // Helper to format numbers cleanly in Millions ($391,035 -> $391.0B or formatted integer)
  const formatVal = (val) => {
    if (!val) return '0';
    return Math.round(val).toLocaleString();
  };

  // Helper to calculate relative percentage bar width
  const getBarWidth = (val, maxVal) => {
    if (!maxVal || maxVal === 0) return '0%';
    const pct = Math.min(100, Math.max(12, (val / maxVal) * 100));
    return `${pct}%`;
  };

  // Dynamic gradient palettes for company progress bars
  const barGradients = [
    'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)', // Blue/Cyan (Apple)
    'linear-gradient(90deg, #8b5cf6 0%, #d946ef 100%)', // Purple/Magenta (Microsoft)
    'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)', // Amber/Red (Tesla)
    'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)', // Emerald/Cyan (User Company 1)
    'linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)', // Pink/Purple (User Company 2)
    'linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)'  // Indigo/Blue (User Company 3)
  ];

  // KPI Config Cards (Matching Screenshot 1 & Requirements)
  const cardConfigs = [
    {
      key: 'revenue',
      title: 'REVENUE',
      subtitle: 'Total company revenue',
      icon: DollarSign,
      iconBg: 'bg-blue-950/60 text-blue-400 border-blue-800/40'
    },
    {
      key: 'net_income',
      title: 'NET INCOME',
      subtitle: 'Net profit after all expenses',
      icon: TrendingUp,
      iconBg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
    },
    {
      key: 'operating_income',
      title: 'OPERATING INCOME',
      subtitle: 'Earnings from operations',
      icon: Activity,
      iconBg: 'bg-amber-950/60 text-amber-400 border-amber-800/40'
    },
    {
      key: 'operating_cash_flow',
      title: 'OPERATING CASH FLOW',
      subtitle: 'Cash flow from operations',
      icon: CreditCard,
      iconBg: 'bg-purple-950/60 text-purple-400 border-purple-800/40'
    },
    {
      key: 'total_assets',
      title: 'TOTAL ASSETS',
      subtitle: 'Total economic resources',
      icon: Landmark,
      iconBg: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40'
    },
    {
      key: 'total_liabilities',
      title: 'TOTAL LIABILITIES',
      subtitle: 'Total outstanding obligations',
      icon: ShieldAlert,
      iconBg: 'bg-rose-950/60 text-rose-400 border-rose-800/40'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* ------------------------------------------------------------------- */}
      {/* SECTION 1: 6 MAJOR KPI CARDS WITH COMPARATIVE BARS */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardConfigs.map((config) => {
          const Icon = config.icon;
          const cardData = kpiSummary[config.key] || { items: [] };
          const items = cardData.items || [];
          
          // Calculate dynamic max value for this card across all ingested companies
          const maxVal = Math.max(...items.map(it => it.value || 0), 100);

          return (
            <div 
              key={config.key}
              className="bg-[#111827]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl glass-card-hover hover:border-slate-700 transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                    {config.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {config.subtitle}
                  </p>
                </div>
                <div className={`p-2 rounded-xl border ${config.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Company Comparison Progress Bars */}
              <div className="space-y-3 mt-4">
                {items.map((item, idx) => {
                  const gradient = barGradients[idx % barGradients.length];
                  const width = getBarWidth(item.value, maxVal);

                  return (
                    <div key={`${item.ticker}-${idx}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {item.ticker}
                          </span>
                          <span>{item.company} ({item.year})</span>
                        </span>
                        <span className="text-white font-mono tracking-tight">
                          ${formatVal(item.value)}
                        </span>
                      </div>

                      {/* Bar Track */}
                      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden p-0.5">
                        <div 
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width, background: gradient }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 2: QUALITATIVE INTELLIGENCE DEEP-DIVE */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-[#111827]/90 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Section Header with Company Selector (Matching Screenshot 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-cyan-950/50 text-cyan-400 border border-cyan-800/40">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Qualitative Intelligence Deep-Dive
              </h2>
              <p className="text-xs text-slate-400">
                Key strategic growth drivers and disclosed risk factors extracted from Form 10-K
              </p>
            </div>
          </div>

          {/* Company Selector Dropdown */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              INSPECT COMPANY
            </span>
            <div className="relative">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold py-2 pl-4 pr-9 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selected Company Subtitle */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {selectedCompanyObj.full_name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Fiscal Year 2024</p>
          </div>
        </div>

        {/* Growth Drivers & Risk Factors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Growth Drivers Card */}
          <div className="bg-slate-900/60 border border-emerald-900/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Top Growth Drivers</span>
            </div>

            <ul className="space-y-3">
              {qualitative.growth_drivers.map((driver, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300 leading-relaxed">
                  <span className="text-emerald-400 mt-0.5 font-bold">✓</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Risk Factors Card */}
          <div className="bg-slate-900/60 border border-rose-900/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Top Risk Factors</span>
            </div>

            <ul className="space-y-3">
              {qualitative.risk_factors.map((risk, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300 leading-relaxed">
                  <span className="text-rose-400 mt-0.5 font-bold">⚠️</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
