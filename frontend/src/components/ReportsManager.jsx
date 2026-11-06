/**
 * ============================================================================
 * REPORTS MANAGER & INGESTION COMPONENT
 * ============================================================================
 * Handles uploading PDF annual reports (Form 10-K), displaying live progress bar
 * during PyMuPDF4LLM Markdown conversion + ChromaDB vector chunking + PostgreSQL KPI extraction,
 * and listing ingested document history.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ReportsManager({ onReportUploaded, setActiveTab }) {
  const [reports, setReports] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [fiscalYear, setFiscalYear] = useState('2024');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get('/reports');
      if (res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.warn("Error fetching reports list:", err);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSuccessMsg('');
      if (!companyName) {
        if (file.name.toLowerCase().includes('apple')) setCompanyName('Apple Inc.');
        else if (file.name.toLowerCase().includes('microsoft')) setCompanyName('Microsoft Corporation');
        else if (file.name.toLowerCase().includes('tesla')) setCompanyName('Tesla, Inc.');
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setSuccessMsg('');
    setUploadProgress(30);
    setUploadStatusText('Converting PDF pages & extracting structured KPIs...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (companyName) formData.append('company_name', companyName);
    if (fiscalYear) formData.append('fiscal_year', fiscalYear);

    try {
      setUploadProgress(70);
      setUploadStatusText('Saving financial metrics & indexing vector chunks...');

      const res = await axios.post('/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      setUploadProgress(100);
      setUploadStatusText('Ingestion complete! Metrics stored & ChromaDB indexed.');
      setSuccessMsg(`Successfully ingested report for ${res.data.company || 'new company'} (${res.data.fiscal_year || 2024})! Dashboard & AI Assistant updated.`);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setSelectedFile(null);
        fetchReports();
        if (onReportUploaded) onReportUploaded();
      }, 600);

    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      alert("Failed to upload report: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await axios.delete(`/reports/${id}`);
      fetchReports();
      if (onReportUploaded) onReportUploaded();
    } catch (err) {
      alert("Failed to delete report.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Upload Box */}
      <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-cyan-400" />
            <span>Ingest PDF Annual Report</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            PyMuPDF4LLM converts PDF to Markdown → SemanticChunker → BGE Embeddings → ChromaDB + PostgreSQL KPI Extraction
          </p>
        </div>

        {/* Success Banner Notification */}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-800/80 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm"
              >
                View on Dashboard →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                COMPANY NAME (OPTIONAL AUTO-DETECT)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apple Inc. or Microsoft"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                FISCAL YEAR
              </label>
              <input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                placeholder="2024"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* File Select Area */}
          <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-8 text-center bg-slate-900/50 transition-all cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-file-input"
            />
            <label htmlFor="pdf-file-input" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                {selectedFile ? selectedFile.name : 'Click to select annual report PDF or drag & drop'}
              </p>
              <p className="text-[11px] text-slate-500">
                Supports Form 10-K, Annual Reports (PDF up to 50MB)
              </p>
            </label>
          </div>

          {/* Uploading Progress Bar (Matching Screenshot 2) */}
          {isUploading && (
            <div className="space-y-2 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>{uploadStatusText}</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="py-2.5 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              {isUploading ? 'Ingesting PDF...' : 'Process & Ingest Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Ingested Document Registry</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Pages</th>
                <th className="py-3 px-4">Semantic Chunks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{r.company_name}</td>
                  <td className="py-3.5 px-4 text-slate-400">{r.fiscal_year}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{r.filename}</td>
                  <td className="py-3.5 px-4 text-slate-400">{r.page_count} pg</td>
                  <td className="py-3.5 px-4 text-cyan-400 font-mono">{r.chunk_count} chunks</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                      <CheckCircle className="w-3 h-3" />
                      <span>{r.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all"
                      title="Delete Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
