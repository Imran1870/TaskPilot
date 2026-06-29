import React, { useState } from 'react';
import { MessageSquare, X, Loader2, Copy, Check, ChevronDown } from 'lucide-react';
import { api } from '../utils/api.js';
import { useToastStore } from '../store/toastStore.js';

/**
 * DraftMessageModal.jsx — Communication Assist
 * Standalone component accessible from any task card.
 * Gemini drafts a polite extension/delay/help message for the user to copy.
 *
 * Google Technology: Gemini API — context-aware message drafting
 * Trust boundary: draft is NEVER auto-sent. User copies manually.
 */

export const DraftMessageModal = ({ task, onClose }) => {
  const [draftType, setDraftType] = useState('extension_request');
  const [recipient, setRecipient] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/rescue/${task._id}/draft-message`, {
        type: draftType,
        recipient: recipient || undefined,
        additionalContext: additionalContext || undefined,
      });
      setDraft(data.draft);
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to generate draft', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    addToast('Draft copied to clipboard! Paste into your email client.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden"
        style={{ background: '#0d1117' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">Draft a Message</h2>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">{task.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Trust Boundary Notice */}
        <div className="px-5 pt-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/20 border border-amber-800/30">
            <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-amber-400/80">
              This draft is for <strong className="text-amber-400">your review only</strong>. It will never be auto-sent. Copy and send it from your own email client.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Message Type</label>
              <div className="relative">
                <select
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                  className="w-full appearance-none bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 pr-8"
                >
                  <option value="extension_request">Extension Request</option>
                  <option value="delay_notification">Delay Notification</option>
                  <option value="help_request">Help Request</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Recipient Role</label>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g., Professor, Manager"
                maxLength={100}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Additional Context (optional)</label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any specific reason or context you'd like included..."
              maxLength={300}
              rows={2}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 placeholder-slate-600 resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {loading ? 'Drafting with Gemini...' : 'Generate Draft'}
          </button>

          {/* Draft Output */}
          {draft && (
            <div className="space-y-3 pt-2">
              <div className="rounded-xl border border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700">
                  <span className="text-xs text-slate-400">Subject: <span className="text-slate-200 font-medium">{draft.subject}</span></span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                  >
                    {copied ? <><Check className="h-3 w-3 text-green-400" />Copied!</> : <><Copy className="h-3 w-3" />Copy All</>}
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{draft.body}</p>
                </div>
              </div>

              {draft.editingNotes && (
                <p className="text-xs text-slate-500 italic px-1">💡 {draft.editingNotes}</p>
              )}
              {draft.suggestedSendTime && (
                <p className="text-xs text-slate-600 px-1">🕐 Send at: {draft.suggestedSendTime}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
