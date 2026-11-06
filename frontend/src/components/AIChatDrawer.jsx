/**
 * ============================================================================
 * SLIDE-OUT AI ANALYST OVERLAY DRAWER (MATCHING SCREENSHOT 1 & 3)
 * ============================================================================
 * Provides an active overlay drawer panel on the right side of the screen
 * allowing instant conversation with the AI Financial Analyst from any view.
 * ============================================================================
 */

import React, { useState } from 'react';
import axios from 'axios';
import { Bot, User, Send, X, FileText, Loader2, Sparkles } from 'lucide-react';

export default function AIChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I'm your AI Financial Analyst. Ask me anything about the ingested company reports — revenue trends, risk analysis, growth drivers, and more.",
      sources: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    const q = inputQuery.trim();
    if (!q || isLoading) return;

    const newMsgs = [...messages, { sender: 'user', text: q }];
    setMessages(newMsgs);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await axios.post('/chat', { question: q });
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
          text: "Error connecting to AI Financial Analyst.",
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#0f172a] border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all">
      {/* Drawer Header (Matching Screenshot 1 & 3) */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>AI Analyst</span>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </h3>
            <p className="text-[10px] text-slate-400">Ask about Form 10-K data</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/40 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-3 text-[11px] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                  <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5" />
                    <span>Source:</span>
                  </p>
                  {msg.sources.map((src, sIdx) => (
                    <p key={sIdx} className="text-[9px] text-slate-400 font-mono">
                      {src.company} ({src.year}) - Page {src.page}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/40 text-cyan-400 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-900 border border-slate-800 text-slate-400 px-3 py-2 rounded-xl text-[11px] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Analyzing context...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AI Analyst..."
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
