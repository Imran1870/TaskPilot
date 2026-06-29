import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock, Zap, MessageSquare, CheckCircle2, Timer, Loader2, Copy, Check } from 'lucide-react';
import { api } from '../utils/api.js';
import { useToastStore } from '../store/toastStore.js';

/**
 * RescueMode.jsx — Full-Screen Crisis Overlay
 * Redesigned as a high-urgency, anxiety-safe tactical cockpit.
 * Leverages temperature-based alert theme (Laser Amber & Vibrant Rose).
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

  // Fetch rescue plan on mount
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
          return;
        }
        addToast(err?.response?.data?.error?.message || 'Failed to generate rescue plan', 'error');
        onClose();
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPlan();
    return () => controller.abort();
  }, [task._id]);

  // Persist Pomodoro timer state
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
          addToast('⏰ Focus session complete! Take a break.', 'success');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/95 backdrop-blur-md">
      {/* Laser Amber glowing solid alert outline */}
      <div className="absolute inset-0 border-[3px] border-amber-500/25 pointer-events-none" />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col bg-[#0a0f1d] border border-amber-500/30 shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-900/30 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-amber-400 uppercase font-display">🔥 Rescue Mode Active</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-950/40 text-amber-300 border border-amber-800/40 font-mono">
                {minutesLeft}m left
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100 truncate mt-0.5">{task.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-slate-350 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800/60 px-6 font-display">
          {[
            { id: 'plan', label: 'Rescue Plan', icon: Zap },
            { id: 'timer', label: 'Focus Timer', icon: Timer },
            { id: 'draft', label: 'Draft Message', icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all focus:outline-none focus:text-amber-400 ${
                activeTab === id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
              <p className="text-slate-400 text-sm font-medium">Gemini is mapping your emergency path...</p>
            </div>
          )}

          {!loading && plan && activeTab === 'plan' && (
            <div className="space-y-5">
              {/* Focus message */}
              <div className="p-4 rounded-xl border border-amber-900/30 bg-amber-950/15">
                <p className="text-amber-300 font-bold text-sm italic">"{plan.focusMessage}"</p>
              </div>

              {/* Minimum Viable Completion */}
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Minimum Viable Completion</h3>
                <p className="text-sm text-slate-200 bg-[#070b14] rounded-lg p-4 border border-slate-800 leading-relaxed">{plan.minimumViableCompletion}</p>
              </div>

              {/* Feasibility */}
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Feasibility Assessment</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{plan.feasibilityAssessment}</p>
              </div>

              {/* Action Steps */}
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Action Steps</h3>
                <div className="space-y-2">
                  {plan.actionSteps.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => toggleStep(i)}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                        completedSteps.has(i)
                          ? 'border-emerald-800/40 bg-emerald-950/20'
                          : step.isNonNegotiable
                          ? 'border-rose-800/40 bg-rose-950/10 hover:bg-rose-950/20'
                          : 'border-slate-800 bg-[#070b14]/50 hover:bg-[#070b14]/80'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        completedSteps.has(i) ? 'border-emerald-500 bg-emerald-600' : 'border-slate-600'
                      }`}>
                        {completedSteps.has(i) && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${completedSteps.has(i) ? 'line-through text-slate-500 font-normal' : 'text-slate-200'}`}>
                            {step.step}
                          </span>
                          {step.isNonNegotiable && (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-900/40 text-rose-300 border border-rose-800/40 flex-shrink-0">Must do</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{step.estimatedMinutes} min</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cut from scope */}
              {plan.cutFromScope?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Cut From Scope (skip these)</h3>
                  <ul className="space-y-1.5 pl-1">
                    {plan.cutFromScope.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="text-rose-500 text-xs">✕</span>
                        <span className="line-through text-slate-500">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Progress */}
              <div className="p-4 rounded-xl bg-[#070b14] border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Steps completed</span>
                  <span className="font-mono">{completedSteps.size}/{plan.actionSteps.length}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all duration-500"
                    style={{ width: `${plan.actionSteps.length ? (completedSteps.size / plan.actionSteps.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timer' && (
            <div className="flex flex-col items-center gap-8 py-6">
              <div className="relative flex items-center justify-center w-48 h-48">
                {/* Anxiety-safe, non-pulsing clean timer track */}
                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="54" fill="none" stroke="rgb(245,158,11)" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerSeconds / (25 * 60))}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="text-4xl font-extrabold text-white font-mono">{formatTimer(timerSeconds)}</span>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{timerRunning ? 'Focusing' : 'Ready'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                {timerPresets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setTimerSeconds(p.secs); setTimerRunning(false); }}
                    className="px-3.5 py-2 text-xs rounded-xl bg-[#070b14] border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setTimerRunning((v) => !v)}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                  timerRunning
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40'
                }`}
              >
                {timerRunning ? 'Pause Session' : 'Start Focus Session'}
              </button>
            </div>
          )}

          {activeTab === 'draft' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-amber-950/15 border border-amber-800/30">
                <p className="text-xs text-amber-300 leading-relaxed">
                  🛡️ <strong>Safety checkpoint:</strong> Draft communication is generated inside ARIA for copy-paste review. It will <strong>never</strong> send emails or Slack triggers automatically.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Message Type</label>
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                  >
                    <option value="extension_request">Extension Request</option>
                    <option value="delay_notification">Delay Notification</option>
                    <option value="help_request">Help Request</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Recipient (optional)</label>
                  <input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g., Professor, Manager"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 placeholder-slate-600"
                  />
                </div>
              </div>

              <button
                onClick={handleDraft}
                disabled={draftLoading}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {draftLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {draftLoading ? 'Drafting emergency dispatch...' : 'Generate Communication Draft'}
              </button>

              {draft && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-800 bg-[#070b14]/50">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subject: <span className="text-slate-200 font-medium normal-case">{draft.subject}</span></p>
                      <button
                        onClick={handleCopyDraft}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition-all focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied!' : 'Copy Copy'}
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{draft.body}</p>
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
