/**
 * ============================================================================
 * MAIN APPLICATION CONTAINER - AI-POWERED INVESTOR INTELLIGENCE PLATFORM
 * ============================================================================
 * Integrates:
 * - Sidebar Navigation (Dashboard, Companies & Trends, Ingest Reports, AI Assistant)
 * - Platform Header
 * - Main Dashboard with KPI cards & Qualitative Deep-Dive
 * - Company Comparison Recharts analytics
 * - Reports Ingestion portal
 * - Slide-out AI Analyst overlay drawer
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configure direct API base URL for FastAPI backend
axios.defaults.baseURL = 'http://localhost:8000';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CompanyComparison from './components/CompanyComparison';
import ReportsManager from './components/ReportsManager';
import AIAssistant from './components/AIAssistant';
import AIChatDrawer from './components/AIChatDrawer';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [kpiSummary, setKpiSummary] = useState({});
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [summaryRes, compRes] = await Promise.all([
        axios.get('/kpis/summary'),
        axios.get('/companies')
      ]);

      if (summaryRes.data) setKpiSummary(summaryRes.data);
      if (compRes.data) setCompanies(compRes.data);
    } catch (err) {
      console.warn("Could not load financial platform data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0f17] text-slate-100 overflow-hidden font-sans">
      {/* Vertical Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <Header 
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          onRefreshData={fetchAllData}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard 
                kpiSummary={kpiSummary}
                companiesList={companies}
                loading={loading}
                onRefresh={fetchAllData}
              />
            )}

            {activeTab === 'compare' && (
              <CompanyComparison 
                companiesList={companies}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsManager 
                onReportUploaded={fetchAllData}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'assistant' && (
              <AIAssistant />
            )}
          </div>
        </main>

        {/* Slide-out AI Analyst Overlay Drawer */}
        <AIChatDrawer 
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      </div>
    </div>
  );
}
