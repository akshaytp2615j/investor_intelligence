/**
 * ============================================================================
 * FULL-PAGE AI CHAT ASSISTANT COMPONENT
 * ============================================================================
 * Grounded RAG Chat Interface featuring quick question prompt chips,
 * real-time typing indicators, structured answer formatting, and source citations
 * (Report name + Page numbers) matching Screenshot 3.
 * ============================================================================
 */

import React, { useState } from 'react';
import axios from 'axios';
import { Bot, User, Send, FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I'm your AI Financial Analyst. Ask me anything about the ingested company annual reports — revenue trends, risk analysis, growth drivers, or side-by-side company comparisons.",
      sources: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    axios.get('/companies').then(res => {
      if (res.data) setCompanies(res.data);
    }).catch(() => {});
  }, []);

  // Quick suggestion chips
  const suggestions = [
    "What was Apple's revenue in 2024?",
    "How did Apple's revenue change from 2023 to 2024?",
    "Compare Apple's and Microsoft's revenue in 2024.",
    "What main risk factors were disclosed by Apple?",
    "What did management say about future growth drivers?"
  ];

  const handleSend = async (queryText = inputQuery) => {
    const q = queryText.trim();
    if (!q || isLoading) return;

    // Add user message
    const newMsgs = [...messages, { sender: 'user', text: q }];
    setMessages(newMsgs);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await axios.post('/chat', {
        question: q,
        company_filter: companyFilter === 'all' ? null : companyFilter
      });

      if (res.data) {
        setMessages([
          ...newMsgs,
          {
            sender: 'ai',
            text: res.data.answer,
            sources: res.data.sources || [],
            grounded: res.data.grounded
          }
        ]);
      }
    } catch (err) {
      setMessages([
        ...newMsgs,
        {
          sender: 'ai',
          text: "I experienced an error connecting to the AI financial analyst server. Please verify backend service availability.",
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-[#111827]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>AI Financial Analyst</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                Grounded RAG Mode
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Powered by BGE Embeddings + ChromaDB + Ollama (llama3.1)</p>
          </div>
        </div>

        {/* Company Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">FILTER REPORT:</span>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs py-1.5 px-3 rounded-xl focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Uploaded Reports</option>
            {companies.map(c => (
              <option key={c.id} value={c.name}>{c.name} Only</option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800/40 text-cyan-400 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-tr-none shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Source Citations (Matching Screenshot 3) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Source Citations:</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 text-[10px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-lg"
                      >
                        <span className="font-semibold text-cyan-300">{src.company} ({src.year})</span>
                        <span className="text-slate-500">• Page {src.page}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800/40 text-cyan-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Searching ChromaDB vector embeddings & querying LLM...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="px-6 py-2 border-t border-slate-800/60 bg-slate-900/40 flex items-center space-x-2 overflow-x-auto">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-[11px] text-slate-500 font-medium shrink-0">Try asking:</span>
        {suggestions.map((sugg, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(sugg)}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 px-3 py-1 rounded-full whitespace-nowrap transition-all"
          >
            {sugg}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-3"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything about financial metrics, risks, or performance trends..."
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs py-3 px-4 rounded-xl focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
