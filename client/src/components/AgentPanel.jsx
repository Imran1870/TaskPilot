import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import { showSuccessToast, showErrorToast } from '../store/toastStore.js';
import {
  Brain,
  CheckCircle,
  Clock,
  RefreshCw,
  Bot,
} from 'lucide-react';

// ── Action type → display metadata ──────────────────────────────────────────
const ACTION_META = {
  reprioritized:       { label: 'Reprioritized',      color: 'text-amber-400',  bg: 'bg-amber-950/15 border-amber-800/30' },
  suggested_split:     { label: 'Suggested Split',    color: 'text-cyan-400',   bg: 'bg-cyan-950/10 border-cyan-800/30' },
  escalated:           { label: 'Escalated',          color: 'text-rose-400',    bg: 'bg-rose-950/10 border-rose-800/30' },
  nudge_sent:          { label: 'Nudge Sent',         color: 'text-sky-400',  bg: 'bg-sky-950/10 border-sky-800/30' },
  rescheduled:         { label: 'Rescheduled',        color: 'text-cyan-400', bg: 'bg-cyan-950/10 border-cyan-800/30' },
  drafted_message:     { label: 'Drafted Message',    color: 'text-sky-400',   bg: 'bg-sky-950/10 border-sky-800/30' },
  ai_breakdown:        { label: 'AI Breakdown',       color: 'text-sky-400', bg: 'bg-sky-950/10 border-sky-800/30' },
  risk_updated:        { label: 'Risk Updated',       color: 'text-slate-500',  bg: 'bg-slate-900/10 border-slate-800/30' },
  suggestion_pending:  { label: 'Suggestion',         color: 'text-amber-400', bg: 'bg-amber-950/15 border-amber-800/30' },
};

// ── Single Log Entry Card (Telemetry/Syslog Monospace Row) ───────────────────
const LogEntry = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Custom monospaced status indicator
  let tagColor = 'text-slate-500';
  let tagLabel = '[INFO]';
  
  switch (log.actionType) {
    case 'reprioritized':
      tagColor = 'text-amber-400';
      tagLabel = '[REPR]';
      break;
    case 'suggested_split':
      tagColor = 'text-cyan-400';
      tagLabel = '[SPLT]';
      break;
    case 'escalated':
      tagColor = 'text-rose-400';
      tagLabel = '[ESCL]';
      break;
    case 'nudge_sent':
      tagColor = 'text-sky-400';
      tagLabel = '[NUDG]';
      break;
    case 'rescheduled':
      tagColor = 'text-cyan-400';
      tagLabel = '[RSCH]';
      break;
    case 'drafted_message':
      tagColor = 'text-sky-400';
      tagLabel = '[DRFT]';
      break;
    case 'ai_breakdown':
      tagColor = 'text-sky-400';
      tagLabel = '[BRKD]';
      break;
    case 'risk_updated':
      tagColor = 'text-slate-500';
      tagLabel = '[RISK]';
      break;
    case 'suggestion_pending':
      tagColor = 'text-amber-400';
      tagLabel = '[SUGG]';
      break;
    default:
      tagColor = 'text-slate-500';
      tagLabel = '[INFO]';
  }

  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isTaskDone = log.relatedTask?.status === 'done';

  return (
    <div className={`font-mono text-xs py-2 px-3 hover:bg-slate-900/40 rounded transition-colors ${isTaskDone ? 'opacity-55' : ''} border-b border-slate-900/60`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-slate-600 flex-shrink-0">[{timeStr}]</span>
          <span className={`font-bold flex-shrink-0 ${tagColor}`}>{tagLabel}</span>
          <div className="flex-1 min-w-0">
            <span className="text-slate-300">
              {log.autoApplied ? 'AUTO-APPLIED' : 'SUGGESTION'}:{' '}
              {log.actionType.replace('_', ' ').toUpperCase()}
            </span>
            {log.relatedTask && (
              <span className={`ml-1.5 text-slate-400 ${isTaskDone ? 'line-through text-slate-600' : ''}`}>
                &gt; "{log.relatedTask.title}"
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 font-mono text-[10px]"
        >
          {expanded ? '[-]' : '[+]'}
        </button>
      </div>

      {/* Expanded reasoning */}
      {expanded && (
        <div className="mt-2 ml-4 pl-3 border-l border-slate-800 space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
          {log.nudgeMessage && (
            <p className="text-sky-400 italic">💬 nudge: "{log.nudgeMessage}"</p>
          )}
          <p>
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Reasoning:</span> {log.reasoning}
          </p>
          <div className="text-[10px] text-slate-600 flex gap-4">
            <span>Source: {log.source}</span>
            {log.geminiTokensUsed > 0 && <span>Tokens: {log.geminiTokensUsed}</span>}
          </div>
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
    <div className="border border-amber-800/30 bg-amber-950/10 rounded-xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              ⏳ Awaiting Review
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.color} border-current bg-transparent`}>
              {meta.label}
            </span>
          </div>
          {suggestion.relatedTask && (
            <p className="text-xs text-slate-200 mt-2 font-bold truncate">
              Task: {suggestion.relatedTask.title}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          {expanded ? '[-]' : '[+]'}
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed font-semibold">{suggestion.reasoning}</p>

      {/* Proposed change details */}
      {expanded && suggestion.suggestedChange && (
        <div className="bg-[#070b14] border border-slate-850 rounded-lg p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Telemetry Change Payload</p>
          <pre className="text-[10px] font-mono text-cyan-400 overflow-x-auto">
            {JSON.stringify(suggestion.suggestedChange, null, 2)}
          </pre>
        </div>
      )}

      {/* Approve / Reject buttons */}
      <div className="flex gap-2.5 pt-1">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
        >
          Apply Change
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

// ── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonLoader = () => (
  <div className="space-y-2 animate-pulse">
    {[1, 2, 3].map((n) => (
      <div key={n} className="border border-slate-800 bg-[#0d1527]/30 rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-3.5 w-24 bg-slate-800 rounded"></div>
          <div className="h-2.5 w-12 bg-slate-800 rounded"></div>
        </div>
        <div className="h-3 w-40 bg-slate-800 rounded mt-1"></div>
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
      // Deduplicate logs
      const rawLogs = logsRes.data.logs || [];
      const seen = new Set();
      const deduped = rawLogs.filter((log) => {
        if (!log.relatedTask) return true;
        const taskKey = log.relatedTask._id;
        const key = `${log.actionType}|${taskKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
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
    <div className="bg-[#0d1527] border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col h-[520px]">
      {/* Panel Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Co-Pilot Command Deck</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Telemetry Logs & Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {suggestions.length > 0 && (
            <span className="bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {suggestions.length} pending review
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={logsLoading}
            className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 rounded-lg"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 font-display">
        {['suggestions', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all focus:outline-none ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            {tab === 'suggestions' ? `Awaiting Actions (${suggestions.length})` : 'Telemetry Syslog'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-[#070b14]/40">
        {logsLoading ? (
          <SkeletonLoader />
        ) : activeTab === 'suggestions' ? (
          suggestions.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-bold">ALL SYSTEMS NOMINAL</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">No pending actions. The agent is scanning telemetry.</p>
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
            <div className="py-16 text-center">
              <Clock className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-bold">NO LOG ENTRIES DETECTED</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Trigger an Agent tick to populate historical actions.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => <LogEntry key={log._id} log={log} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
};
