import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Sparkles,
  FileText,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Bot,
  User,
  Zap,
  RotateCcw,
} from 'lucide-react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Example prompts for the welcome state
// ---------------------------------------------------------------------------
const EXAMPLE_PROMPTS = [
  'What are the main requirements in this document?',
  'What deadlines are mentioned?',
  'Who is responsible for compliance?',
  'What evidence is required?',
  'What personal information is collected?',
  'What happens if a requirement is not followed?',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ConfidenceBadge({ confidence }) {
  const pct = Math.round(confidence * 100);
  let color, label;
  if (pct >= 70) { color = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'; label = 'High'; }
  else if (pct >= 40) { color = 'text-amber-400 bg-amber-950/60 border-amber-500/30'; label = 'Medium'; }
  else { color = 'text-rose-400 bg-rose-950/60 border-rose-500/30'; label = 'Low'; }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${color}`}>
      <Zap className="w-2.5 h-2.5" />
      {pct}% grounding
    </span>
  );
}

// ---------------------------------------------------------------------------
// Source Card Component
// ---------------------------------------------------------------------------
function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl bg-[#0B1020]/80 border border-slate-700/60 overflow-hidden transition-all duration-200 hover:border-cyan-500/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-cyan-950/80 border border-cyan-500/30">
            <FileText className="w-3 h-3 text-neon-cyan" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300">
            Page {source.page}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {Math.round(source.relevance * 100)}% relevance
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="p-2.5 rounded-lg bg-[#050816]/60 border border-slate-800/60">
            <p className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
              {source.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Message Component
// ---------------------------------------------------------------------------
function ChatMessage({ message, isLast }) {
  const isUser = message.role === 'user';
  const isThinking = message.thinking;

  if (isThinking) {
    return (
      <div className="flex items-start gap-3 animate-pulse">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0 shadow-neon-cyan">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="rounded-2xl rounded-tl-sm bg-[#0F172A]/90 border border-slate-800/80 px-4 py-3 shadow-cyber-card">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-neon-cyan" />
              <span className="text-neon-cyan">{message.content}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="flex-1 flex justify-end">
          <div className="max-w-lg rounded-2xl rounded-tr-sm bg-gradient-to-br from-cyan-950/80 to-cyan-900/60 border border-cyan-500/30 px-4 py-3 shadow-neon-cyan-sm">
            <p className="text-sm text-white leading-relaxed">{message.content}</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0 shadow-neon-cyan mt-0.5">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-2xl space-y-2">
        {/* Answer card */}
        <div className="rounded-2xl rounded-tl-sm bg-[#0F172A]/90 border border-slate-800/80 px-4 py-3.5 shadow-cyber-card">
          {message.error ? (
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300 leading-relaxed">{message.content}</p>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap m-0">{message.content}</p>
            </div>
          )}

          {/* Confidence badge */}
          {typeof message.confidence === 'number' && !message.error && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
              <ConfidenceBadge confidence={message.confidence} />
              {message.grounded === false && (
                <span className="text-[10px] font-mono text-slate-500">No document match</span>
              )}
            </div>
          )}
        </div>

        {/* Source cards */}
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1">
              📄 Sources ({message.sources.length})
            </p>
            {message.sources.map((source, i) => (
              <SourceCard key={i} source={source} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RAG Status Indicator
// ---------------------------------------------------------------------------
function RagStatusBadge({ ragStatus, onIndex, isIndexing }) {
  if (ragStatus === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        RAG Ready
      </span>
    );
  }
  if (ragStatus === 'indexing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Indexing...
      </span>
    );
  }
  return (
    <button
      onClick={onIndex}
      disabled={isIndexing}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:border-rose-400 transition disabled:opacity-50"
    >
      {isIndexing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
      {isIndexing ? 'Indexing...' : 'Index Document'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Welcome Screen
// ---------------------------------------------------------------------------
function WelcomeScreen({ onPromptClick, docName }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-950 to-purple-950 border border-cyan-500/40 flex items-center justify-center mb-5 shadow-neon-cyan">
        <Sparkles className="w-8 h-8 text-neon-cyan" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Hello, I am PolicyLens AI 👋</h2>
      <p className="text-sm text-slate-400 max-w-sm mb-8 leading-relaxed">
        Ask questions about this document and I will find the relevant sections for you.
      </p>

      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="text-left px-3.5 py-2.5 rounded-xl bg-[#0F172A]/80 border border-slate-700/60 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white hover:bg-[#111C32] transition-all duration-200 group"
          >
            <span className="text-neon-cyan group-hover:mr-1 transition-all">→</span>{' '}
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ChatPage Component
// ---------------------------------------------------------------------------
export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Document state
  const [doc, setDoc] = useState(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState(null);

  // RAG state
  const [ragStatus, setRagStatus] = useState('unavailable');
  const [isIndexing, setIsIndexing] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load document metadata and RAG status
  // ---------------------------------------------------------------------------
  const loadDocument = useCallback(async () => {
    try {
      setDocLoading(true);
      setDocError(null);
      const data = await api.getDocument(id);
      setDoc(data);
    } catch (err) {
      setDocError('Document not found or unable to load.');
    } finally {
      setDocLoading(false);
    }
  }, [id]);

  const loadRagStatus = useCallback(async () => {
    try {
      const data = await api.getRagStatus(id);
      setRagStatus(data.rag_status);
    } catch (err) {
      setRagStatus('unavailable');
    }
  }, [id]);

  useEffect(() => {
    loadDocument();
    loadRagStatus();
  }, [loadDocument, loadRagStatus]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Manual re-index trigger (if RAG is unavailable)
  // ---------------------------------------------------------------------------
  const handleManualIndex = async () => {
    setIsIndexing(true);
    setRagStatus('indexing');
    try {
      // We don't have pages stored client-side; inform user to re-analyze
      addSystemMessage(
        "To index this document for PolicyLens AI, please re-upload and re-analyze the document. " +
        "RAG indexing happens automatically after analysis."
      );
    } finally {
      setIsIndexing(false);
      await loadRagStatus();
    }
  };

  // ---------------------------------------------------------------------------
  // Chat helpers
  // ---------------------------------------------------------------------------
  const addSystemMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'assistant', content: text, sources: [], confidence: null, grounded: false },
    ]);
  };

  const buildConversationHistory = () => {
    // Send last 10 messages (not thinking placeholders) as context
    return messages
      .filter((m) => !m.thinking && !m.error)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
  };

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isSending) return;

    setInput('');
    setIsSending(true);

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Add thinking placeholder with cycling status
    const thinkingId = Date.now() + 1;
    const thinkingStages = [
      'Searching document...',
      'Reviewing relevant sections...',
      'Preparing answer...',
    ];
    let stageIdx = 0;
    setMessages((prev) => [
      ...prev,
      { id: thinkingId, role: 'assistant', thinking: true, content: thinkingStages[0] },
    ]);

    // Cycle thinking message
    const stageInterval = setInterval(() => {
      stageIdx = (stageIdx + 1) % thinkingStages.length;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId ? { ...m, content: thinkingStages[stageIdx] } : m
        )
      );
    }, 900);

    try {
      const history = buildConversationHistory();
      const result = await api.chatWithDocument(id, text, history);

      clearInterval(stageInterval);

      // Replace thinking with real answer
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                id: thinkingId,
                role: 'assistant',
                content: result.answer,
                sources: result.sources || [],
                confidence: result.confidence,
                grounded: result.grounded,
                thinking: false,
              }
            : m
        )
      );

      // Update RAG status to ready if we got a response
      if (result.grounded) setRagStatus('ready');
    } catch (err) {
      clearInterval(stageInterval);
      let errorMsg = 'Something went wrong. Please try again.';
      if (err.message.includes('not found')) errorMsg = 'Document not found.';
      else if (err.message.includes('not configured') || err.message.includes('AI')) errorMsg = 'AI service is unavailable. Check backend configuration.';
      else if (err.message.includes('indexed') || err.message.includes('unavailable')) errorMsg = 'This document is not indexed yet. Please re-analyze it to enable PolicyLens AI.';
      else if (err.message) errorMsg = err.message;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? {
                id: thinkingId,
                role: 'assistant',
                content: errorMsg,
                error: true,
                sources: [],
                confidence: null,
                thinking: false,
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handlePromptClick = (prompt) => {
    handleSend(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('Clear conversation? This will reset the chat history.')) {
      setMessages([]);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (docLoading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-slate-400">Loading PolicyLens AI...</p>
        </div>
      </div>
    );
  }

  if (docError) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center p-6">
        <div className="rounded-3xl bg-rose-950/30 border border-rose-500/40 p-8 text-center max-w-md">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">{docError}</h3>
          <button
            onClick={() => navigate('/documents')}
            className="mt-4 px-4 py-2 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-500/40 text-sm font-mono hover:border-rose-400 transition"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-screen bg-[#050816] flex flex-col" style={{ height: '100vh' }}>
      {/* Ambient background */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/4 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/4 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* ─── HEADER ─── */}
      <header className="shrink-0 border-b border-slate-800/80 bg-[#0B1020]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back button */}
          <Link
            to={`/documents/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="w-px h-4 bg-slate-700" />

          {/* Logo / Title */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-950 to-purple-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-neon-cyan" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white leading-none">PolicyLens AI</h1>
              <p className="text-[10px] font-mono text-slate-400 leading-none mt-0.5 truncate">
                Ask anything about this document.
              </p>
            </div>
          </div>

          {/* Document context indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F172A]/80 border border-slate-700/60">
              <FileText className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-mono text-slate-400 max-w-[140px] truncate" title={doc?.filename}>
                {doc?.filename || `Document #${id}`}
              </span>
            </div>
            <RagStatusBadge
              ragStatus={ragStatus}
              onIndex={handleManualIndex}
              isIndexing={isIndexing}
            />
          </div>

          {/* Clear chat */}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Clear conversation"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── RAG NOT READY BANNER ─── */}
      {ragStatus === 'unavailable' && (
        <div className="shrink-0 bg-amber-950/30 border-b border-amber-500/30 px-4 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs font-mono text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              RAG index not ready. Re-upload and analyze the document to enable PolicyLens AI.
            </span>
            <Link to="/upload" className="ml-auto text-amber-200 underline underline-offset-2 hover:text-white transition whitespace-nowrap">
              Upload →
            </Link>
          </div>
        </div>
      )}

      {/* ─── CHAT AREA ─── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isEmpty ? (
            <WelcomeScreen
              onPromptClick={handlePromptClick}
              docName={doc?.filename}
            />
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ─── INPUT BAR ─── */}
      <div className="shrink-0 border-t border-slate-800/80 bg-[#0B1020]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className={`flex items-end gap-2 rounded-2xl border transition-all duration-200 ${
            isSending
              ? 'border-slate-700/60 bg-[#0F172A]/60'
              : 'border-slate-700/80 bg-[#0F172A]/80 focus-within:border-cyan-500/50 focus-within:shadow-neon-cyan-sm'
          }`}>
            <textarea
              ref={inputRef}
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder={ragStatus === 'unavailable' ? 'Index the document first...' : 'Ask a question...'}
              aria-label="Ask PolicyLens AI a question"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 px-4 py-3 resize-none focus:outline-none min-h-[48px] max-h-[120px] leading-relaxed disabled:opacity-50"
              style={{ height: '48px' }}
            />
            <button
              id="send-chat-message"
              onClick={() => handleSend()}
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className={`m-2 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                isSending || !input.trim()
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-[#050816] hover:shadow-neon-cyan cursor-pointer'
              }`}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] font-mono text-slate-600 mt-1.5 px-1">
            Enter to send · Shift+Enter for new line · Answers grounded in the uploaded document
          </p>
        </div>
      </div>
    </div>
  );
}
