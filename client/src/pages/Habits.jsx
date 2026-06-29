import React, { useState, useEffect } from 'react';
import { Flame, Plus, Check, Trash2, Edit3, X, Loader2, Trophy, Target, Calendar, TrendingUp, Zap } from 'lucide-react';
import { api } from '../utils/api.js';
import { useToastStore } from '../store/toastStore.js';
import { ConfirmModal } from '../components/ConfirmModal.jsx';

const CATEGORY_COLORS = {
  fitness: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  learning: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  mindfulness: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', dot: 'bg-violet-400' },
  productivity: { bg: 'bg-brand-500/10', border: 'border-brand-500/30', text: 'text-brand-400', dot: 'bg-brand-400' },
  health: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
  social: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', dot: 'bg-pink-400' },
  other: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', dot: 'bg-slate-400' },
};

const FREQ_LABELS = {
  daily: 'Daily',
  '3x_week': '3× / week',
  '5x_week': '5× / week',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  custom: 'Custom',
};

const defaultForm = {
  title: '',
  category: 'other',
  targetFrequency: 'daily',
  reminderTime: '',
  agentNudgeEnabled: true,
};

export const Habits = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [deleteHabitId, setDeleteHabitId] = useState(null);
  const addToast = useToastStore((s) => s.addToast);

  const fetchHabits = async () => {
    try {
      const { data } = await api.get('/habits');
      setHabits(data.habits || []);
    } catch (err) {
      addToast('Failed to load habits', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHabits(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { data } = await api.put(`/habits/${editingId}`, formData);
        setHabits((prev) => prev.map((h) => h._id === editingId ? data.habit : h));
        addToast('Habit updated!', 'success');
      } else {
        const { data } = await api.post('/habits', formData);
        setHabits((prev) => [data.habit, ...prev]);
        addToast('Habit created! 🎯', 'success');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(defaultForm);
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to save habit', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (habit) => {
    setCompletingId(habit._id);
    try {
      const { data } = await api.post(`/habits/${habit._id}/complete`);
      setHabits((prev) => prev.map((h) => h._id === habit._id ? data.habit : h));
      addToast(data.message, 'success');
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to complete habit', 'error');
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = (id) => {
    setDeleteHabitId(id);
  };

  const executeDelete = async () => {
    if (!deleteHabitId) return;
    try {
      await api.delete(`/habits/${deleteHabitId}`);
      setHabits((prev) => prev.filter((h) => h._id !== deleteHabitId));
      addToast('Habit deleted', 'info');
    } catch {
      addToast('Failed to delete habit', 'error');
    } finally {
      setDeleteHabitId(null);
    }
  };

  const handleEdit = (habit) => {
    setEditingId(habit._id);
    setFormData({
      title: habit.title,
      category: habit.category || 'other',
      targetFrequency: habit.targetFrequency,
      reminderTime: habit.reminderTime || '',
      agentNudgeEnabled: habit.agentNudgeEnabled ?? true,
    });
    setShowForm(true);
  };

  const totalStreaks = habits.reduce((acc, h) => acc + h.streakCount, 0);
  const atRiskCount = habits.filter((h) => h.streakAtRisk).length;
  const completedToday = habits.filter((h) => h.completedToday).length;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <ConfirmModal
        isOpen={!!deleteHabitId}
        title="Delete Habit"
        message="Are you sure you want to delete this habit? All streak counts and history for this habit will be permanently lost."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteHabitId(null)}
      />
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-400" />
              Habit Tracker
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Build consistency. The AI agent nudges you before streaks break.</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData(defaultForm); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-900/30"
          >
            <Plus className="h-4 w-4" />
            New Habit
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Habits', value: habits.length, icon: Target, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
            { label: 'Completed Today', value: `${completedToday}/${habits.length}`, icon: Check, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { label: 'At Risk Today', value: atRiskCount, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`p-4 rounded-xl border ${bg} ${border}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200">{editingId ? 'Edit Habit' : 'New Habit'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1 text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Habit Title *</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Read 30 minutes, Morning run, Meditate"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 placeholder-slate-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    {Object.keys(CATEGORY_COLORS).map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Frequency</label>
                  <select
                    value={formData.targetFrequency}
                    onChange={(e) => setFormData((p) => ({ ...p, targetFrequency: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    {Object.entries(FREQ_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Reminder Time</label>
                  <input
                    type="time"
                    value={formData.reminderTime}
                    onChange={(e) => setFormData((p) => ({ ...p, reminderTime: e.target.value }))}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="nudge"
                  checked={formData.agentNudgeEnabled}
                  onChange={(e) => setFormData((p) => ({ ...p, agentNudgeEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 accent-brand-500"
                />
                <label htmlFor="nudge" className="text-xs text-slate-400">
                  Enable AI nudges when streak is at risk
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingId ? 'Save Changes' : 'Create Habit'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 text-sm font-medium transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Habits List */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((n) => (
              <div key={n} className="rounded-xl border border-slate-800 bg-slate-900/10 p-5 space-y-3">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-800 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3 rounded-2xl border border-dashed border-slate-800">
            <Flame className="h-12 w-12 text-slate-800" />
            <p className="text-slate-500 font-medium">No habits yet</p>
            <p className="text-xs text-slate-600">Create your first habit and start building streaks!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {habits.map((habit) => {
              const colors = CATEGORY_COLORS[habit.category] || CATEGORY_COLORS.other;
              const streakPct = Math.min(100, (habit.streakCount / 30) * 100);
              return (
                <div
                  key={habit._id}
                  className={`rounded-xl border transition-all animate-fade-in ${
                    habit.streakAtRisk
                      ? 'border-orange-800/40 bg-orange-950/10'
                      : habit.completedToday
                      ? 'border-green-800/30 bg-green-950/10'
                      : 'border-slate-800/60 bg-slate-900/30'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Complete Button */}
                      <button
                        onClick={() => handleComplete(habit)}
                        disabled={completingId === habit._id || habit.completedToday}
                        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                          habit.completedToday
                            ? 'border-green-500 bg-green-600/20'
                            : 'border-slate-600 hover:border-brand-500 hover:bg-brand-500/10'
                        }`}
                      >
                        {completingId === habit._id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : habit.completedToday ? (
                          <Check className="h-5 w-5 text-green-400" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border-2 border-slate-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="font-semibold text-slate-100 text-sm">{habit.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.border} ${colors.text}`}>
                            {habit.category}
                          </span>
                          {habit.streakAtRisk && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-950/40 text-orange-400 border border-orange-800/40 animate-pulse">
                              🔥 Streak at risk!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{FREQ_LABELS[habit.targetFrequency]}</p>

                        {/* Streak bar */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Flame className={`h-3 w-3 ${habit.streakCount > 0 ? 'text-orange-400' : 'text-slate-600'}`} />
                              {habit.streakCount}-day streak
                            </span>
                            <span>{FREQ_LABELS[habit.targetFrequency]}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-700 ${
                                habit.streakCount >= 30 ? 'bg-gradient-to-r from-orange-400 to-yellow-400'
                                : habit.streakCount >= 7 ? 'bg-gradient-to-r from-brand-500 to-indigo-500'
                                : 'bg-brand-600'
                              }`}
                              style={{ width: `${streakPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {habit.agentNudgeEnabled && (
                          <div title="AI nudges enabled" className="flex items-center justify-center w-7 h-7 rounded-lg text-brand-400">
                            <Zap className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <button onClick={() => handleEdit(habit)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(habit._id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
