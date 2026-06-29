import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { showSuccessToast, showErrorToast } from '../store/toastStore.js';
import {
  Sparkles,
  X,
  CheckCircle,
  Clock,
  Loader2,
  Brain,
  AlertCircle,
  Check,
} from 'lucide-react';

/**
 * AIBreakdownModal
 *
 * Google Technology: Gemini API — on-demand task decomposition
 * Triggered when user clicks "🤖 Ask AI to break this down"
 * Displays Gemini's proposed subtask breakdown; user can select which to accept.
 */
export const AIBreakdownModal = ({ task, onClose, onAccepted }) => {
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSubtasks, setSelectedSubtasks] = useState(new Set());
  const [accepting, setAccepting] = useState(false);

  const requestBreakdown = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/api/tasks/${task._id}/ai-breakdown`);
      const { subtasks, overallReasoning, logId } = res.data.breakdown;
      setBreakdown({ subtasks, overallReasoning, logId });
      // Pre-select all subtasks
      setSelectedSubtasks(new Set(subtasks.map((_, i) => i)));
    } catch (err) {
      const msg = err.response?.data?.error?.message
        || err.response?.data?.message
        || 'Failed to generate breakdown. Check your API key and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubtask = (index) => {
    const next = new Set(selectedSubtasks);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedSubtasks(next);
  };

  const handleAccept = async () => {
    if (selectedSubtasks.size === 0) {
      showErrorToast('Select at least one subtask to add.');
      return;
    }
    setAccepting(true);
    try {
      const chosen = breakdown.subtasks.filter((_, i) => selectedSubtasks.has(i));
      await api.post(`/api/tasks/${task._id}/ai-breakdown/accept`, {
        logId: breakdown.logId,
        selectedSubtasks: chosen.map((s) => ({ title: s.title, done: false })),
      });
      showSuccessToast(`✅ ${selectedSubtasks.size} subtask(s) added from AI breakdown!`);
      onAccepted?.();
      onClose();
    } catch (err) {
      showErrorToast(err.response?.data?.error?.message || 'Failed to apply breakdown');
    } finally {
      setAccepting(false);
    }
  };

  const minutesLeft = Math.round((new Date(task.deadline) - Date.now()) / 60000);
  const totalSelected = breakdown?.subtasks.filter((_, i) => selectedSubtasks.has(i))
    .reduce((acc, s) => acc + s.estimatedMinutes, 0) || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">AI Breakdown</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Powered by Gemini · {minutesLeft > 0 ? `${minutesLeft}m remaining` : 'Past deadline'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task title */}
        <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Task</p>
            <p className="text-sm font-semibold text-slate-200">{task.title}</p>
          </div>
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="self-start sm:self-center px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              💡 Appends to {task.subtasks.length} existing
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Empty state — ask Gemini */}
          {!breakdown && !loading && !error && (
            <div className="text-center py-4 space-y-4">
              <Sparkles className="h-12 w-12 text-indigo-400 mx-auto" />
              <div>
                <p className="text-sm text-slate-200 font-semibold">Let Gemini plan this for you</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                  The AI will analyze your task, deadline, and context — then propose
                  time-estimated subtasks you can add in one click.
                </p>
              </div>
              <button
                onClick={requestBreakdown}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/30"
              >
                <Brain className="h-4 w-4" />
                Generate Breakdown
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Gemini is analyzing your task...</p>
              <p className="text-xs text-slate-600">This takes 3-10 seconds</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300 font-medium">Failed to generate breakdown</p>
              </div>
              <p className="text-xs text-red-400/80">{error}</p>
              <button
                onClick={requestBreakdown}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Breakdown results */}
          {breakdown && (
            <div className="space-y-4">
              {/* AI reasoning */}
              <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-xl px-4 py-3">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">
                  Gemini's Strategy
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{breakdown.overallReasoning}</p>
              </div>

              {/* Subtask selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Proposed Subtasks
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedSubtasks.size}/{breakdown.subtasks.length} selected
                    {totalSelected > 0 && ` · ~${totalSelected}m`}
                  </p>
                </div>

                {/* ⚠️ Timeline sanity check — does the breakdown fit in the remaining time? */}
                {minutesLeft > 0 && totalSelected > minutesLeft && (
                  <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-700/40 rounded-xl px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-300">
                        Breakdown exceeds your timeline
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Selected subtasks need <strong className="text-amber-300">~{totalSelected}m</strong> but only{' '}
                        <strong className="text-red-400">{minutesLeft}m</strong> remain.
                        Consider deselecting lower-priority subtasks, or activate <strong className="text-orange-300">Rescue Mode</strong> for a focused minimum-viable plan.
                      </p>
                    </div>
                  </div>
                )}

                {breakdown.subtasks.map((subtask, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSubtask(i)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedSubtasks.has(i)
                        ? 'bg-indigo-950/40 border-indigo-700/60'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-4 w-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                        selectedSubtasks.has(i)
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-slate-600'
                      }`}>
                        {selectedSubtasks.has(i) && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-200 truncate">{subtask.title}</p>
                          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full">
                            <Clock className="h-2.5 w-2.5" />
                            {subtask.estimatedMinutes}m
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{subtask.rationale}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Time warning */}
              {minutesLeft > 0 && totalSelected > minutesLeft && (
                <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    Selected tasks ({totalSelected}m) exceed time remaining ({minutesLeft}m)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {breakdown && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => {
                setBreakdown(null);
                setError(null);
                setSelectedSubtasks(new Set());
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting || selectedSubtasks.size === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/30"
            >
              {accepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Add {selectedSubtasks.size} Subtask{selectedSubtasks.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


