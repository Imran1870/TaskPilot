import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Clock, Zap, MessageSquare, ChevronRight, CheckCircle2, Timer, Loader2, Copy, Check } from 'lucide-react';
import { api } from '../utils/api.js';
import { useToastStore } from '../store/toastStore.js';

/**
 * RescueMode.jsx — Full-Screen Crisis Overlay
 * Triggered when a task is due in < 2 hours with high risk score.
 * Features: MVP rescue plan, focus timer, draft message, reschedule suggestions.
 *
 * Google Technology: Gemini API powers the rescue plan and draft message.
 */

export const RescueMode = ({ task, onClose, onTaskUpdated }) => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plan');
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [draftType, setDraftType] = useState('extension_request');
  const [recipient, setRecipient] = useState('');
  const [copied, setCopied] = useState(false);
  const [timerRunning, setTimerRunning] = useState(() => {
    const savedId = localStorage.getItem('rescue_pomodoro_task_id');
    if (savedId === task._id) {
      const running = localStorage.getItem('rescue_pomodoro_running') === 'true';
      if (running) {
        const savedAt = parseInt(localStorage.getItem('rescue_pomodoro_saved_at') || '0', 10);
        const savedSecs = parseInt(localStorage.getItem('rescue_pomodoro_seconds') || '0', 10);
        const elapsed = Math.floor((Date.now() - savedAt) / 1000);
        if (savedSecs - elapsed <= 0) return false;
      }
      return running;
    }
    return false;
  });

  const [timerSeconds, setTimerSeconds] = useState(() => {
    const savedId = localStorage.getItem('rescue_pomodoro_task_id');
    if (savedId === task._id) {
      const running = localStorage.getItem('rescue_pomodoro_running') === 'true';
      const savedSecs = parseInt(localStorage.getItem('rescue_pomodoro_seconds') || '1500', 10);
      if (running) {
        const savedAt = parseInt(localStorage.getItem('rescue_pomodoro_saved_at') || '0', 10);
        const elapsed = Math.floor((Date.now() - savedAt) / 1000);
        return Math.max(0, savedSecs - elapsed);
      }
      return savedSecs;
    }
    return 25 * 60;
  });

  const [completedSteps, setCompletedSteps] = useState(new Set());
  const addToast = useToastStore((s) => s.addToast);

  // Fetch rescue plan on mount — cancellable if user closes early
  useEffect(() => {
    const controller = new AbortController();
    const fetchPlan = async () => {
      try {
        const { data } = await api.post(`/rescue/${task._id}/plan`, {}, {
          signal: controller.signal,
        });
        setPlan(data.plan);
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || controller.signal.aborted) {
          // Silently ignore — user closed rescue mode
          return;
        }
        addToast(err?.response?.data?.error?.message || 'Failed to generate rescue plan', 'error');
        onClose();
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPlan();
    // Cleanup: abort in-flight request when component unmounts (user closes)
    return () => controller.abort();
  }, [task._id]);

  // Persist Pomodoro timer state in localStorage
  useEffect(() => {
    localStorage.setItem('rescue_pomodoro_task_id', task._id);
    localStorage.setItem('rescue_pomodoro_running', timerRunning ? 'true' : 'false');
    localStorage.setItem('rescue_pomodoro_seconds', timerSeconds.toString());
    localStorage.setItem('rescue_pomodoro_saved_at', Date.now().toString());
  }, [timerRunning, timerSeconds, task._id]);

  // Pomodoro focus timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          addToast('⏰ Focus session complete! Take a 5-minute break.', 'success');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const minutesLeft = Math.max(0, Math.round((new Date(task.deadline) - Date.now()) / 60000));

  const handleDraft = async () => {
    setDraftLoading(true);
    try {
      const { data } = await api.post(`/rescue/${task._id}/draft-message`, {
        type: draftType,
        recipient: recipient || undefined,
      });
      setDraft(data.draft);
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to generate draft', 'error');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCopyDraft = () => {
    if (!draft) return;
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Draft copied to clipboard!', 'success');
  };

  const toggleStep = (idx) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const timerPresets = [
    { label: '10 min', secs: 10 * 60 },
    { label: '25 min', secs: 25 * 60 },
    { label: `${Math.min(minutesLeft, 45)} min`, secs: Math.min(minutesLeft, 45) * 60 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(2,4,10,0.97)' }}>
      {/* Animated danger border */}
      <div className="absolute inset-0 border-4 border-red-600/40 pointer-events-none animate-pulse" />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
        style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0808 100%)', border: '1px solid rgba(239,68,68,0.4)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-900/40"
          style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 100%)' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600/20 border border-red-600/40">
            <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-red-400 uppercase">⚡ Rescue Mode Active</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-900/50 text-red-300 border border-red-700/50">
                {minutesLeft}m left
              </span>
            </div>
            <p className="text-sm font-semibold text-white truncate mt-0.5">{task.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/60 px-6">
          {[
            { id: 'plan', label: 'Rescue Plan', icon: Zap },
            { id: 'timer', label: 'Focus Timer', icon: Timer },
            { id: 'draft', label: 'Draft Message', icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === id
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Loader2 className="h-8 w-8 text-red-400 animate-spin" />
              <p className="text-slate-400 text-sm">Gemini is generating your rescue plan...</p>
            </div>
          )}

          {!loading && plan && activeTab === 'plan' && (
            <div className="space-y-5">
              {/* Focus message */}
              <div className="p-4 rounded-xl border border-red-900/40 bg-red-950/20">
                <p className="text-red-300 font-medium text-sm italic">"{plan.focusMessage}"</p>
              </div>

              {/* Minimum Viable Completion */}
              <div>
                <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Minimum Viable Completion</h3>
                <p className="text-sm text-slate-200 bg-white/5 rounded-lg p-3 border border-slate-800">{plan.minimumViableCompletion}</p>
              </div>

              {/* Feasibility */}
              <div>
                <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Feasibility Assessment</h3>
                <p className="text-sm text-slate-400">{plan.feasibilityAssessment}</p>
              </div>

              {/* Action Steps */}
              <div>
                <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Action Steps</h3>
                <div className="space-y-2">
                  {plan.actionSteps.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => toggleStep(i)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        completedSteps.has(i)
                          ? 'border-green-800/40 bg-green-950/20'
                          : step.isNonNegotiable
                          ? 'border-red-800/40 bg-red-950/10 hover:bg-red-950/20'
                          : 'border-slate-800 bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        completedSteps.has(i) ? 'border-green-500 bg-green-600' : 'border-slate-600'
                      }`}>
                        {completedSteps.has(i) && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${completedSteps.has(i) ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {step.step}
                          </span>
                          {step.isNonNegotiable && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-red-900/40 text-red-400 border border-red-800/40 flex-shrink-0">Must do</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{step.estimatedMinutes} min</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cut from scope */}
              {plan.cutFromScope?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">Cut From Scope (skip these)</h3>
                  <ul className="space-y-1">
                    {plan.cutFromScope.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-500">
                        <X className="h-3 w-3 text-red-600 flex-shrink-0" />
                        <span className="line-through">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Progress */}
              <div className="p-3 rounded-lg bg-white/5 border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>Steps completed</span>
                  <span>{completedSteps.size}/{plan.actionSteps.length}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-500"
                    style={{ width: `${plan.actionSteps.length ? (completedSteps.size / plan.actionSteps.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timer' && (
            <div className="flex flex-col items-center gap-8 py-6">
              <div className="relative flex items-center justify-center w-48 h-48">
                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(239,68,68,0.1)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54" fill="none" stroke="rgb(239,68,68)" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerSeconds / (25 * 60))}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-4xl font-bold text-white font-mono">{formatTimer(timerSeconds)}</span>
                  <p className="text-xs text-slate-500 mt-1">{timerRunning ? 'Focus' : 'Ready'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                {timerPresets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setTimerSeconds(p.secs); setTimerRunning(false); }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setTimerRunning((v) => !v)}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
                  timerRunning
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
                }`}
              >
                {timerRunning ? 'Pause' : 'Start Focus Session'}
              </button>
            </div>
          )}

          {activeTab === 'draft' && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30">
                <p className="text-xs text-amber-400">
                  ⚠️ <strong>Trust boundary:</strong> This draft is for your review only. Copy and send it manually — it will <strong>never</strong> be auto-sent.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Message Type</label>
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="extension_request">Extension Request</option>
                    <option value="delay_notification">Delay Notification</option>
                    <option value="help_request">Help Request</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Recipient (optional)</label>
                  <input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g., Professor, Manager"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500 placeholder-slate-600"
                  />
                </div>
              </div>

              <button
                onClick={handleDraft}
                disabled={draftLoading}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {draftLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {draftLoading ? 'Drafting with Gemini...' : 'Generate Draft'}
              </button>

              {draft && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-700 bg-white/5">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-xs text-slate-400 font-medium">Subject: <span className="text-slate-200">{draft.subject}</span></p>
                      <button
                        onClick={handleCopyDraft}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all"
                      >
                        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{draft.body}</p>
                  </div>
                  {draft.editingNotes && (
                    <p className="text-xs text-slate-500 italic">💡 {draft.editingNotes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
