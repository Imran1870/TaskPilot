import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, AlertCircle, X, Check, Save, ExternalLink } from 'lucide-react';
import { api } from '../utils/api.js';
import { useToastStore } from '../store/toastStore.js';

export const VoiceCapture = ({ onTaskCreated, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true); // Browser support flag
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [savingTask, setSavingTask] = useState(false);
  
  // Confirmation form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('work');
  const [priority, setPriority] = useState('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);

  const recognitionRef = useRef(null);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    rec.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      setTranscript(resultText);
    };

    rec.onerror = (event) => {
      console.error('[SpeechRecognition] Error:', event.error);
      if (event.error === 'network') {
        addToast('Speech recognition requires an internet connection to reach Google\'s servers. Please check your network and try again.', 'error');
      } else if (event.error === 'no-speech') {
        addToast('No speech was detected. Please try speaking closer to your mic.', 'warning');
      } else {
        addToast(`Voice capture error: ${event.error}`, 'error');
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setExtractedData(null);
      recognitionRef.current.start();
    }
  };

  const handleParse = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/tasks/parse-voice', { transcript });
      if (data.success && data.extracted) {
        const confidence = data.extracted.confidence;
        const autoSaveEligible = (confidence === 'high' || confidence === 'medium') && data.extracted.title;

        if (autoSaveEligible) {
          setSavingTask(true);
          try {
            const saveRes = await api.post('/api/tasks', {
              title: data.extracted.title,
              description: data.extracted.description || '',
              deadline: data.extracted.deadline || undefined,
              category: data.extracted.category || 'personal',
              priority: data.extracted.priority || 'medium',
              estimatedMinutes: data.extracted.estimatedMinutes || 30,
            });
            if (saveRes.data.success) {
              addToast('🎉 Voice task captured & auto-saved successfully!', 'success');
              if (onTaskCreated) onTaskCreated(saveRes.data.task);
              if (onClose) onClose();
              return;
            }
          } catch (saveErr) {
            console.error('[VoiceCapture] Auto-save failed, falling back to manual form review:', saveErr);
          } finally {
            setSavingTask(false);
          }
        }

        // Low confidence fallback: show review form
        setExtractedData(data.extracted);
        setTitle(data.extracted.title || '');
        setDescription(data.extracted.description || '');
        setCategory(data.extracted.category || 'personal');
        setPriority(data.extracted.priority || 'medium');
        setEstimatedMinutes(data.extracted.estimatedMinutes || 30);
        
        if (data.extracted.deadline) {
          const d = new Date(data.extracted.deadline);
          const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDeadline(localStr);
        } else {
          setDeadline('');
        }

        if (data.extracted.extractionNotes && data.extracted.extractionNotes.includes('fallback')) {
          addToast('Voice parsed (Offline Fallback) — review details below.', 'warning');
        } else {
          addToast('Review extracted task details below.', 'info');
        }
      }
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to parse voice transcript', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setSavingTask(true);
    try {
      const { data } = await api.post('/api/tasks', {
        title,
        description,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        category,
        priority,
        estimatedMinutes,
      });

      if (data.success) {
        addToast('Task created successfully!', 'success');
        if (onTaskCreated) onTaskCreated(data.task);
        if (onClose) onClose();
      }
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to save task', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-brand-400" />
            <h2 className="text-sm font-bold text-slate-100">Voice-Enabled Task Capture</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* Browser not supported — shown instead of recorder */}
          {!isSupported && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 bg-slate-950/40 rounded-xl border border-amber-800/40">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-amber-400" />
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-bold text-amber-300">Voice Capture Not Supported</p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Your browser doesn't support the Web Speech API.
                  Voice capture requires <strong className="text-white">Google Chrome</strong> or a Chromium-based browser.
                </p>
                <a
                  href="https://www.google.com/chrome/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Download Chrome
                </a>
              </div>
            </div>
          )}

          {/* Recorder View — only shown when browser supports Web Speech API */}
          {isSupported && (
            <>
              <div className="flex flex-col items-center justify-center py-6 bg-slate-950/40 rounded-xl border border-slate-800 space-y-4">
                <button
                  onClick={toggleListening}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' 
                      : 'bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20'
                  }`}
                >
                  {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
                <p className="text-xs text-slate-400 font-medium">
                  {isListening ? 'Listening... speak your task naturally' : 'Tap to start recording'}
                </p>

                {transcript && (
                  <div className="w-full px-6 text-center">
                    <p className="text-sm text-slate-200 italic">"{transcript}"</p>
                  </div>
                )}
              </div>

              {/* Action to Parse */}
              {transcript && !isListening && !extractedData && (
                <button
                  onClick={handleParse}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? 'AI Parsing transcript...' : 'Extract Task with Gemini'}
                </button>
              )}
            </>
          )}

          {/* AI Pre-filled Confirmation Form */}
          {extractedData && (
            <form onSubmit={handleSaveTask} className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/30">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <div className="text-[11px] text-indigo-300">
                  <span className="font-bold">Confidence: {extractedData.confidence?.toUpperCase()}</span>
                  {extractedData.extractionNotes && <p className="mt-0.5">{extractedData.extractionNotes}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="work">Work</option>
                    <option value="study">Study</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingTask}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {savingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Task
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
