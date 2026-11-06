/**
 * ============================================================================
 * COMPANY COMPARISON & TRENDS COMPONENT - DYNAMIC RECHARTS VISUALIZATION
 * ============================================================================
 * Renders interactive, 100% dynamic Recharts analytics:
 * 1. Multi-Year Metric Trend Line Chart (Dynamic Fiscal Years: 2022 → 2026)
 * 2. Multi-Company Side-by-Side Comparison Bar Chart
 * 3. Interactive Company Checkbox Toggles & Metric Filters
 * Sourced directly from PostgreSQL / SQLite database via REST API.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { BarChart2, TrendingUp, Filter, Check } from 'lucide-react';

export default function CompanyComparison({ companiesList }) {
  const [kpiData, setKpiData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedBarYear, setSelectedBarYear] = useState('latest');

  const colorPalette = [
    '#06b6d4', // Cyan
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#f43f5e'  // Rose
  ];

  useEffect(() => {
    fetchComparisonData();
  }, [companiesList]);

  const fetchComparisonData = async () => {
    try {
      const res = await axios.get('/kpis/compare');
      if (res.data) {
        setKpiData(res.data);
        
        // Extract all unique companies present in DB rows
        const uniqueComps = Array.from(new Set(res.data.map(d => d.company_name))).filter(Boolean);
        if (uniqueComps.length > 0 && selectedCompanies.length === 0) {
          setSelectedCompanies(uniqueComps);
        }
      }
    } catch (err) {
      console.warn("Could not fetch comparison data:", err);
    }
  };

  // List of all unique company names in kpiData or companiesList
  const allCompanyNames = Array.from(
    new Set([
      ...(companiesList || []).map(c => c.name),
      ...kpiData.map(d => d.company_name)
    ])
  ).filter(Boolean);

  // Available fiscal years present in database
  const availableYears = Array.from(new Set(kpiData.map(d => d.fiscal_year))).sort((a, b) => a - b);
  const latestYear = availableYears.length > 0 ? availableYears[availableYears.length - 1] : 2024;

  // Toggle company selection on/off
  const toggleCompany = (compName) => {
    if (selectedCompanies.includes(compName)) {
      if (selectedCompanies.length > 1) {
        setSelectedCompanies(selectedCompanies.filter(c => c !== compName));
      }
    } else {
      setSelectedCompanies([...selectedCompanies, compName]);
    }
  };

  // Metrics list
  const metrics = [
    { id: 'revenue', label: 'Revenue ($M)' },
    { id: 'net_income', label: 'Net Income ($M)' },
    { id: 'operating_cash_flow', label: 'Operating Cash Flow ($M)' },
    { id: 'operating_income', label: 'Operating Income ($M)' },
    { id: 'eps', label: 'Diluted EPS ($)' },
    { id: 'total_assets', label: 'Total Assets ($M)' },
    { id: 'total_liabilities', label: 'Total Liabilities ($M)' },
    { id: 'free_cash_flow', label: 'Free Cash Flow ($M)' }
  ];

  // Build dynamic data array for Recharts Trend Line Chart (by fiscal year)
  const getTrendChartData = () => {
    const yrs = availableYears.length > 0 ? availableYears : [2022, 2023, 2024, 2026];
    return yrs.map(yr => {
      const entry = { year: String(yr) };
      kpiData.forEach(item => {
        if (item.fiscal_year === yr && (selectedCompanies.length === 0 || selectedCompanies.includes(item.company_name))) {
          entry[item.company_name] = item[selectedMetric] || 0;
        }
      });
      return entry;
    });
  };

  // Build dynamic data for Bar Chart comparison (for selected year)
  const getBarChartData = () => {
    const targetYr = selectedBarYear === 'latest' ? latestYear : Number(selectedBarYear);
    const entry = { year: String(targetYr) };
    
    kpiData.forEach(item => {
      if (item.fiscal_year === targetYr && (selectedCompanies.length === 0 || selectedCompanies.includes(item.company_name))) {
        entry[item.company_name] = item[selectedMetric] || 0;
      }
    });

    // Also fallback for companies that don't have this exact year, show their latest available
    allCompanyNames.forEach(cname => {
      if (!entry[cname] && (selectedCompanies.length === 0 || selectedCompanies.includes(cname))) {
        const cItems = kpiData.filter(d => d.company_name === cname);
        if (cItems.length > 0) {
          const latestCItem = cItems.reduce((prev, curr) => (curr.fiscal_year > prev.fiscal_year ? curr : prev));
          entry[cname] = latestCItem[selectedMetric] || 0;
        }
      }
    });

    return [entry];
  };

  const trendData = getTrendChartData();
  const barData = getBarChartData();
  const activeCompanies = selectedCompanies.length > 0 ? selectedCompanies : allCompanyNames;

  return (
    <div className="space-y-8 pb-12">
      {/* Controls & Metric Selectors */}
      <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-cyan-400" />
              <span>Financial Metric Analytics & Trend Comparison</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare financial metrics across all ingested companies and fiscal years
            </p>
          </div>

          {/* Metric Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">SELECT METRIC:</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {metrics.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Company Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>TOGGLE COMPANIES:</span>
          </span>

          {allCompanyNames.map((comp, idx) => {
            const isSelected = activeCompanies.includes(comp);
            const compColor = colorPalette[idx % colorPalette.length];

            return (
              <button
                key={comp}
                onClick={() => toggleCompany(comp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-700 shadow-md'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/60 opacity-50 hover:opacity-80'
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: compColor }}
                ></span>
                <span>{comp}</span>
                {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Year Trend Chart */}
        <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Multi-Year Metric Trend (Fiscal Years: {availableYears.join(', ') || '2022-2026'})</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-medium bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-0.5 rounded-full">
              PostgreSQL Sourced
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {allCompanyNames.map((company, idx) => {
                  if (!activeCompanies.includes(company)) return null;
                  return (
                    <Line 
                      key={company} 
                      type="monotone" 
                      dataKey={company} 
                      stroke={colorPalette[idx % colorPalette.length]} 
                      strokeWidth={3} 
                      dot={{ r: 5 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side-by-Side Bar Chart Comparison */}
        <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <span>Company Comparison</span>
            </h3>
            
            {/* Year Selector for Bar Chart */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 font-medium">YEAR:</span>
              <select
                value={selectedBarYear}
                onChange={(e) => setSelectedBarYear(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs py-1 px-2.5 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="latest">Latest Year ({latestYear})</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>Fiscal {yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {allCompanyNames.map((company, idx) => {
                  if (!activeCompanies.includes(company)) return null;
                  return (
                    <Bar 
                      key={company} 
                      dataKey={company} 
                      fill={colorPalette[idx % colorPalette.length]} 
                      radius={[6, 6, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
