import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import { showSuccessToast, showErrorToast } from '../store/toastStore.js';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  Info,
  Bot,
} from 'lucide-react';

// ── Action type → display metadata ──────────────────────────────────────────
const ACTION_META = {
  reprioritized:       { label: 'Reprioritized',      color: 'text-amber-400',  bg: 'bg-amber-950/30 border-amber-800/40' },
  suggested_split:     { label: 'Suggested Split',    color: 'text-blue-400',   bg: 'bg-blue-950/30 border-blue-800/40' },
  escalated:           { label: 'Escalated',          color: 'text-red-400',    bg: 'bg-red-950/30 border-red-800/40' },
  nudge_sent:          { label: 'Nudge Sent',         color: 'text-brand-400',  bg: 'bg-brand-950/30 border-brand-800/40' },
  rescheduled:         { label: 'Rescheduled',        color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-800/40' },
  drafted_message:     { label: 'Drafted Message',    color: 'text-teal-400',   bg: 'bg-teal-950/30 border-teal-800/40' },
  ai_breakdown:        { label: 'AI Breakdown',       color: 'text-indigo-400', bg: 'bg-indigo-950/30 border-indigo-800/40' },
  risk_updated:        { label: 'Risk Updated',       color: 'text-slate-400',  bg: 'bg-slate-900/30 border-slate-800/40' },
  suggestion_pending:  { label: 'Suggestion',         color: 'text-orange-400', bg: 'bg-orange-950/30 border-orange-800/40' },
};

// ── Single Log Entry Card ────────────────────────────────────────────────────
const LogEntry = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[log.actionType] || ACTION_META.risk_updated;
  const isDegraded = log.source === 'deterministic_fallback';
  const isTaskDone = log.relatedTask?.status === 'done';

  return (
    <div className={`border rounded-xl p-4 transition-all ${meta.bg} animate-fade-in ${isTaskDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {log.autoApplied ? (
            <Zap className={`h-4 w-4 flex-shrink-0 ${meta.color}`} title="Auto-applied by AI" />
          ) : (
            <Bot className={`h-4 w-4 flex-shrink-0 ${meta.color}`} title="AI suggestion" />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>
                {meta.label}
              </span>
              {isDegraded && (
                <span className="text-[9px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full border border-slate-700">
                  Fallback Mode
                </span>
              )}
              {log.autoApplied && (
                <span className="text-[9px] font-semibold uppercase tracking-wider bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-800">
                  Auto-Applied
                </span>
              )}
              {isTaskDone && (
                <span className="text-[9px] font-semibold uppercase tracking-wider bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-800">
                  ✅ Task Completed
                </span>
              )}
            </div>
            {log.relatedTask && (
              <p className={`text-xs mt-0.5 font-medium ${isTaskDone ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                → {log.relatedTask.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-slate-500">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Show reasoning"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Nudge message (if exists) */}
      {log.nudgeMessage && (
        <div className="mt-3 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-300 italic leading-relaxed">💬 {log.nudgeMessage}</p>
        </div>
      )}

      {/* Expandable reasoning */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-semibold">Why I did this: </span>
              {log.reasoning}
            </p>
          </div>
          {log.geminiTokensUsed > 0 && (
            <p className="text-[10px] text-slate-600">~{log.geminiTokensUsed} tokens used</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Pending Suggestion Card ──────────────────────────────────────────────────
const SuggestionCard = ({ suggestion, onApprove, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const meta = ACTION_META[suggestion.actionType] || ACTION_META.suggestion_pending;

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(suggestion._id);
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(suggestion._id);
    setLoading(false);
  };

  return (
    <div className="border border-orange-800/40 bg-orange-950/20 rounded-xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              ⏳ Awaiting Your Approval
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${meta.color} border-current bg-transparent`}>
              {meta.label}
            </span>
          </div>
          {suggestion.relatedTask && (
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Task: {suggestion.relatedTask.title}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Reasoning preview */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{suggestion.reasoning}</p>

      {/* Proposed change details */}
      {expanded && suggestion.suggestedChange && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Proposed Change</p>
          <pre className="text-xs text-slate-300 overflow-x-auto">
            {JSON.stringify(suggestion.suggestedChange, null, 2)}
          </pre>
        </div>
      )}

      {/* Approve / Reject buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Apply
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
};

// ── Skeleton Loader (Premium Micro-interactions) ─────────────────────────────
const SkeletonLoader = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3].map((n) => (
      <div key={n} className="border border-slate-800 bg-slate-900/10 rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 bg-slate-800 rounded"></div>
          <div className="h-3 w-16 bg-slate-800 rounded"></div>
        </div>
        <div className="h-3 w-48 bg-slate-800 rounded mt-2"></div>
        <div className="h-2 w-32 bg-slate-800 rounded mt-1"></div>
      </div>
    ))}
  </div>
);

// ── Main Agent Panel Component ───────────────────────────────────────────────
export const AgentPanel = () => {
  const [logs, setLogs] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suggestions'); // suggestions | history

  const fetchData = useCallback(async () => {
    setLogsLoading(true);
    try {
      const [logsRes, suggestionsRes] = await Promise.all([
        api.get('/api/agent/logs?limit=40'),
        api.get('/api/agent/pending-suggestions'),
      ]);
      // Deduplicate logs: collapse identical actionType+task within 60s window
      const rawLogs = logsRes.data.logs || [];
      const seen = new Map();
      const deduped = rawLogs.filter((log) => {
        const taskKey = log.relatedTask?._id || 'global';
        const timeBucket = Math.floor(new Date(log.timestamp).getTime() / 60000); // 1-min buckets
        const key = `${log.actionType}|${taskKey}|${timeBucket}`;
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
      });
      setLogs(deduped);
      setSuggestions(suggestionsRes.data.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch agent data', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/api/agent/suggestions/${id}/approve`);
      showSuccessToast('Agent suggestion approved and applied!');
      fetchData();
    } catch (err) {
      showErrorToast(err.response?.data?.error?.message || 'Failed to approve suggestion');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/api/agent/suggestions/${id}/reject`);
      showSuccessToast('Suggestion dismissed — no changes made.');
      fetchData();
    } catch (err) {
      showErrorToast('Failed to reject suggestion');
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
      {/* Panel Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Your AI Assistant</h3>
            <p className="text-[10px] text-slate-500">Autonomous decisions and suggestions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {suggestions.length > 0 && (
            <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {suggestions.length} pending
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={logsLoading}
            className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {['suggestions', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-brand-400 border-b-2 border-brand-500 bg-brand-500/5'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'suggestions' ? `Pending (${suggestions.length})` : 'AI History'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {logsLoading ? (
          <SkeletonLoader />
        ) : activeTab === 'suggestions' ? (
          suggestions.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">All clear!</p>
              <p className="text-xs text-slate-600 mt-1">No pending suggestions. Your agent is watching.</p>
            </div>
          ) : (
            suggestions.map((s) => (
              <SuggestionCard
                key={s._id}
                suggestion={s}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          )
        ) : (
          logs.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No agent history yet</p>
              <p className="text-xs text-slate-600 mt-1">Trigger a tick or wait for the scheduler.</p>
            </div>
          ) : (
            logs.map((log) => <LogEntry key={log._id} log={log} />)
          )
        )}
      </div>
    </div>
  );
};


