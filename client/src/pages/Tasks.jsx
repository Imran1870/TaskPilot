import React, { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { taskSchema } from '../../../shared/schemas.js';
import { showSuccessToast, showErrorToast, showInfoToast } from '../store/toastStore.js';
import { 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Calendar, 
  AlertTriangle,
  Folder,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  SlidersHorizontal,
  Mic,
  MessageSquare,
  Sparkles,
  Pencil,
  X as XIcon
} from 'lucide-react';
import { VoiceCapture } from '../components/VoiceCapture.jsx';
import { DraftMessageModal } from '../components/DraftMessageModal.jsx';
import { ConfirmModal } from '../components/ConfirmModal.jsx';
import { AIBreakdownModal } from '../components/AIBreakdownModal.jsx';

export const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('deadline:asc');

  // View Mode: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState('list');
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [draftTask, setDraftTask] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [breakdownTask, setBreakdownTask] = useState(null);
  const [editTask, setEditTask] = useState(null); // task being edited
  const [editFormData, setEditFormData] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 'medium',
    category: 'personal',
    estimatedMinutes: 0,
    recurrence: 'none',
  });
  
  // Temporary subtask builder in form
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [formSubtasks, setFormSubtasks] = useState([]);

  // Fetch paginated lists of tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/tasks', {
        params: {
          page,
          limit: 6,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          sortBy,
        }
      });
      if (response.data.success) {
        setTasks(response.data.tasks);
        setTotalPages(response.data.totalPages);
        setTotalTasks(response.data.total);
      }
    } catch (err) {
      console.error('Error fetching tasks', err);
      showErrorToast('Failed to load tasks list.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch calendar tasks for selected month
  const fetchCalendarData = async () => {
    setCalendarLoading(true);
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    try {
      const response = await api.get(`/api/tasks/calendar?month=${monthStr}`);
      if (response.data.success) {
        setCalendarTasks(response.data.tasks);
      }
    } catch (err) {
      console.error('Error fetching calendar data', err);
      showErrorToast('Failed to load calendar tasks.');
    } finally {
      setCalendarLoading(false);
    }
  };

  // Trigger fetches depending on viewMode
  useEffect(() => {
    if (viewMode === 'list') {
      fetchTasks();
    } else {
      fetchCalendarData();
    }
  }, [page, statusFilter, categoryFilter, sortBy, viewMode, currentDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = value;
    if (name === 'estimatedMinutes') {
      parsedValue = parseInt(value, 10) || 0;
    }
    setFormData({ ...formData, [name]: parsedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    setSubmitError('');
  };

  // Add subtask to local list during creation
  const addSubtaskToFormList = () => {
    if (!newSubtaskTitle.trim()) return;
    setFormSubtasks([...formSubtasks, { title: newSubtaskTitle.trim(), done: false }]);
    setNewSubtaskTitle('');
  };

  const removeSubtaskFromFormList = (index) => {
    setFormSubtasks(formSubtasks.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    // Pre-validate deadline formatting
    let deadlineStr = formData.deadline;
    if (deadlineStr) {
      const date = new Date(deadlineStr);
      if (!isNaN(date.getTime())) {
        deadlineStr = date.toISOString();
      }
    }

    const payload = {
      ...formData,
      deadline: deadlineStr,
      subtasks: formSubtasks,
    };

    // Client-side Zod validation
    const result = taskSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/tasks', payload);
      if (response.data.success) {
        showSuccessToast('Task created successfully!');
        
        // Reset states
        setFormData({
          title: '',
          description: '',
          deadline: '',
          priority: 'medium',
          category: 'personal',
          estimatedMinutes: 0,
          recurrence: 'none',
        });
        setFormSubtasks([]);
        
        // Reload appropriate view
        if (viewMode === 'list') {
          fetchTasks();
        } else {
          fetchCalendarData();
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to create task';
      setSubmitError(errorMsg);
      showErrorToast(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = (taskId) => {
    setDeleteTaskId(taskId);
  };

  // ── Edit Task Handlers ────────────────────────────────────────────────────
  const openEditModal = (task) => {
    // Pre-format deadline for datetime-local input (YYYY-MM-DDTHH:MM)
    let deadlineLocal = '';
    if (task.deadline) {
      const d = new Date(task.deadline);
      deadlineLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
    setEditFormData({
      title: task.title || '',
      description: task.description || '',
      deadline: deadlineLocal,
      priority: task.priority || 'medium',
      category: task.category || 'personal',
      estimatedMinutes: task.estimatedMinutes || 0,
      recurrence: task.recurrence || 'none',
    });
    setEditErrors({});
    setEditTask(task);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let parsed = value;
    if (name === 'estimatedMinutes') parsed = parseInt(value, 10) || 0;
    setEditFormData((prev) => ({ ...prev, [name]: parsed }));
    if (editErrors[name]) setEditErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editTask) return;
    setEditErrors({});

    let deadlineStr = editFormData.deadline;
    if (deadlineStr) {
      const d = new Date(deadlineStr);
      if (!isNaN(d.getTime())) deadlineStr = d.toISOString();
    }

    const payload = { ...editFormData, deadline: deadlineStr };
    const result = taskSchema.partial().safeParse(payload);
    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((err) => { fieldErrors[err.path[0]] = err.message; });
      setEditErrors(fieldErrors);
      return;
    }

    setEditSubmitting(true);
    try {
      const response = await api.patch(`/api/tasks/${editTask._id}`, payload);
      if (response.data.success) {
        showSuccessToast('Task updated!');
        setEditTask(null);
        if (viewMode === 'list') fetchTasks();
        else fetchCalendarData();
      }
    } catch (err) {
      showErrorToast(err.response?.data?.error?.message || 'Failed to update task');
    } finally {
      setEditSubmitting(false);
    }
  };

  const executeDeleteTask = async () => {
    if (!deleteTaskId) return;
    const targetId = deleteTaskId;
    setDeleteTaskId(null);

    const backupTasks = [...tasks];
    // Optimistic delete
    setTasks(tasks.filter((t) => t._id !== targetId));
    setTotalTasks((prev) => Math.max(prev - 1, 0));

    try {
      const response = await api.delete(`/api/tasks/${targetId}`);
      if (response.data.success) {
        showSuccessToast('Task soft-deleted.');
        if (viewMode === 'calendar') {
          fetchCalendarData();
        }
      }
    } catch (err) {
      // Rollback
      setTasks(backupTasks);
      setTotalTasks(backupTasks.length);
      showErrorToast('Failed to delete task. Restored.');
    }
  };

  // Optimistic toggle for task status
  const handleToggleStatus = async (task) => {
    const prevStatus = task.status;
    const nextStatus = prevStatus === 'done' ? 'pending' : 'done';

    // Optimistic Update
    const updatedTasks = tasks.map((t) => 
      t._id === task._id ? { ...t, status: nextStatus } : t
    );
    setTasks(updatedTasks);

    // Keep backup in case of error
    const backupTasks = [...tasks];

    try {
      const response = await api.patch(`/api/tasks/${task._id}`, {
        status: nextStatus,
      });
      
      if (response.data.success) {
        if (nextStatus === 'done') {
          showSuccessToast('Task completed!');
          if (task.recurrence !== 'none') {
            showInfoToast(`Recurring task: generated next instance.`);
          }
        }
        // Sync final model changes (like newly computed riskScore)
        setTasks(
          updatedTasks.map((t) => (t._id === task._id ? response.data.task : t))
        );
        if (viewMode === 'calendar') {
          fetchCalendarData();
        }
      }
    } catch (err) {
      // Rollback on server error
      setTasks(backupTasks);
      showErrorToast('Failed to update task status. Rolled back.');
    }
  };

  // Optimistic toggle for subtask
  const handleToggleSubtask = async (task, subtaskIndex) => {
    const backupTasks = [...tasks];
    
    // Modify deep nested structure optimistically
    const updatedSubtasks = [...task.subtasks];
    updatedSubtasks[subtaskIndex].done = !updatedSubtasks[subtaskIndex].done;

    const updatedTaskObject = {
      ...task,
      subtasks: updatedSubtasks
    };

    setTasks(tasks.map((t) => (t._id === task._id ? updatedTaskObject : t)));

    try {
      const response = await api.post(`/api/tasks/${task._id}/subtasks`, {
        subtaskId: task.subtasks[subtaskIndex]._id,
        done: updatedSubtasks[subtaskIndex].done
      });
      
      if (response.data.success) {
        // Sync database computed states (riskScore updates dynamically)
        setTasks(
          tasks.map((t) => (t._id === task._id ? response.data.task : t))
        );
      }
    } catch (err) {
      // Rollback
      setTasks(backupTasks);
      showErrorToast('Failed to save subtask status.');
    }
  };

  // Compute color based on riskScore
  const getRiskScoreColor = (score) => {
    if (score >= 80) return 'text-amber-400 border-amber-900/40 bg-amber-950/20';
    if (score >= 40) return 'text-rose-400 border-rose-900/40 bg-rose-950/20';
    return 'text-sky-400 border-sky-900/40 bg-sky-950/20';
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-amber-950/30 text-amber-400 border-amber-800/40';
      case 'high': return 'bg-rose-950/30 text-rose-400 border-rose-800/40';
      case 'medium': return 'bg-sky-950/30 text-sky-400 border-sky-800/40';
      default: return 'bg-slate-900/50 text-slate-400 border-slate-800/40';
    }
  };

  // Helper to compile days in month for Calendar View
  const getDaysInMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // index 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    // Padding days from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(year, month, d));
    }
    return grid;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getMonthName = () => {
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header and View Toggler */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Tasks</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage tasks and organize your scheduling engine.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowVoiceCapture(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d1527] border border-slate-800 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-slate-850 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            <Mic className="h-3.5 w-3.5" />
            Voice Capture
          </button>
          
          <div className="flex items-center gap-2 bg-[#070b14] border border-slate-850 rounded-lg p-1.5 shadow-inner">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                viewMode === 'list' 
                  ? 'bg-cyan-600 text-white shadow shadow-cyan-900/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                viewMode === 'calendar' 
                  ? 'bg-cyan-600 text-white shadow shadow-cyan-900/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar View
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create Task Form (Always visible) */}
        <div className="lg:col-span-1 bg-[#0d1527] border border-slate-800 rounded-xl p-6 shadow-lg h-fit space-y-4">
          <h3 className="text-md font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Plus className="h-5 w-5 text-cyan-400" />
            New Goal
          </h3>

          <form onSubmit={handleCreateTask} className="space-y-4">
            {submitError && (
              <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Pay utility invoice"
                className={`mt-1.5 w-full bg-[#070b14] border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35 ${
                  errors.title ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief notes..."
                className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35"
                >
                  <option value="personal">Personal</option>
                  <option value="assignment">Assignment</option>
                  <option value="meeting">Meeting</option>
                  <option value="bill">Bill</option>
                  <option value="interview">Interview</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline (Future Date)</label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className={`mt-1.5 w-full bg-[#070b14] border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35 ${
                  errors.deadline ? 'border-rose-500' : 'border-slate-800'
                }`}
              />
              {errors.deadline && <p className="text-xs text-rose-400 mt-1">{errors.deadline}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration (min)</label>
                <input
                  type="number"
                  name="estimatedMinutes"
                  value={formData.estimatedMinutes}
                  onChange={handleChange}
                  min={0}
                  className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Recurrence</label>
                <select
                  name="recurrence"
                  value={formData.recurrence}
                  onChange={handleChange}
                  className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Subtask Builder inside Form */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtasks ({formSubtasks.length})</label>
              
              {/* Form subtasks inline list */}
              {formSubtasks.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                  {formSubtasks.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-[#070b14] px-2 py-1.5 rounded border border-slate-850 text-slate-300">
                      <span className="truncate">{sub.title}</span>
                      <button 
                        type="button" 
                        onClick={() => removeSubtaskFromFormList(idx)} 
                        className="text-red-400 hover:text-red-300 ml-1.5"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add subtask input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="e.g. Gather paperwork"
                  className="flex-1 bg-[#070b14] border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35"
                />
                <button
                  type="button"
                  onClick={addSubtaskToFormList}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 rounded text-xs font-semibold border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  Add
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
            >
              {submitting ? 'Creating task...' : 'Add Task'}
            </button>
          </form>
        </div>

        {/* Right Side: List View OR Calendar View */}
        <div className="lg:col-span-2 space-y-4">
          
          {viewMode === 'list' ? (
            /* LIST VIEW MODE */
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
              
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="bg-slate-900 border border-slate-750 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="snoozed">Snoozed</option>
                  </select>

                  {/* Category filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                    className="bg-slate-900 border border-slate-750 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">All Categories</option>
                    <option value="personal">Personal</option>
                    <option value="assignment">Assignment</option>
                    <option value="meeting">Meeting</option>
                    <option value="bill">Bill</option>
                    <option value="interview">Interview</option>
                    <option value="other">Other</option>
                  </select>

                  {/* Sorting */}
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    className="bg-slate-900 border border-slate-750 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
                  >
                    <option value="deadline:asc">Deadline (Soonest)</option>
                    <option value="deadline:desc">Deadline (Latest)</option>
                    <option value="aiMeta.riskScore:desc">Risk Score (Highest)</option>
                    <option value="aiMeta.riskScore:asc">Risk Score (Lowest)</option>
                    <option value="title:asc">Title (A-Z)</option>
                  </select>
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  {totalTasks} task(s) found
                </div>
              </div>

              {/* Tasks List */}
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="border border-slate-800 bg-slate-900/10 rounded-xl p-5 space-y-3">
                      <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                      <div className="h-3 w-1/2 bg-slate-800 rounded mt-2"></div>
                      <div className="flex gap-2 mt-4">
                        <div className="h-3 w-20 bg-slate-800 rounded"></div>
                        <div className="h-3 w-16 bg-slate-800 rounded"></div>
                        <div className="h-3 w-24 bg-slate-800 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-850 rounded-xl">
                  <SlidersHorizontal className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm font-medium">No tasks match the active filters.</p>
                  <p className="text-slate-600 text-xs mt-1">Adjust filters or create a new task on the left.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const score = task.aiMeta?.riskScore || 0;
                    const borderLeftClass = task.status === 'done'
                      ? ''
                      : score >= 80
                        ? 'border-l-4 border-l-amber-500'
                        : score >= 40
                          ? 'border-l-4 border-l-rose-500'
                          : 'border-l-4 border-l-sky-500';

                    return (
                      <div 
                        key={task._id} 
                        className={`border rounded-xl p-5 bg-[#0d1527] transition-all animate-fade-in ${borderLeftClass} ${
                          task.status === 'done' 
                            ? 'border-slate-850 opacity-60' 
                            : 'border-slate-800 hover:border-slate-700 shadow-md shadow-slate-950/50'
                        }`}
                      >
                        {/* Title and delete action */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <button 
                              type="button"
                              onClick={() => handleToggleStatus(task)}
                              aria-label={task.status === 'done' ? 'Mark task as pending' : 'Mark task as completed'}
                              className="mt-1 text-cyan-400 hover:text-cyan-300"
                            >
                              {task.status === 'done' ? (
                                <CheckSquare className="h-5 w-5" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-600 hover:text-slate-500" />
                              )}
                            </button>
                            <div>
                              <h4 className={`font-bold text-slate-100 text-base ${task.status === 'done' ? 'line-through text-slate-500 font-medium' : ''}`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* AI Breakdown — only for active tasks */}
                            {task.status !== 'done' && task.status !== 'missed' && (
                              <button
                                type="button"
                                onClick={() => setBreakdownTask(task)}
                                title="AI Task Breakdown — Gemini breaks this into subtasks"
                                aria-label="Get AI subtask breakdown for this task"
                                className="text-indigo-400 hover:text-indigo-300 p-1.5 hover:bg-indigo-500/10 rounded-lg transition-colors"
                              >
                                <Sparkles className="h-4 w-4" />
                              </button>
                            )}

                            {/* Edit Task */}
                            <button
                              type="button"
                              onClick={() => openEditModal(task)}
                              title="Edit task"
                              aria-label="Edit task details"
                              className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-500/10 rounded-lg transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDraftTask(task)}
                              title="Draft delay/extension message"
                              aria-label="Draft communication message using Gemini"
                              className="text-cyan-400 hover:text-cyan-300 p-1.5 hover:bg-cyan-500/10 rounded-lg transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task._id)}
                              title="Delete task"
                              aria-label="Delete task goal"
                              className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Badges and riskScore Indicator */}
                        <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] font-bold uppercase tracking-wider">
                          {/* Risk score badge with redundant colorblind labeling */}
                          <span 
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${getRiskScoreColor(score)}`}
                            title={`AI Urgency Risk is ${score}%`}
                            aria-label={`Urgency Risk is ${score} percent`}
                          >
                            {score >= 80 ? (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                                <span>🔥 Danger: {score}%</span>
                              </>
                            ) : score >= 40 ? (
                              <span>🌹 Alert: {score}%</span>
                            ) : (
                              <span>❄️ Safe: {score}%</span>
                            )}
                          </span>

                          {/* Priority */}
                          <span className={`px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(task.priority)}`}>
                            {task.priority}
                          </span>

                          {/* Status */}
                          {task.status === 'missed' && (
                            <span className="px-2 py-0.5 rounded-full border border-red-950 bg-red-950/20 text-red-400">
                              Missed
                            </span>
                          )}
                          {task.status === 'done' && (
                            <span className="px-2 py-0.5 rounded-full border border-emerald-950 bg-emerald-950/20 text-emerald-400">
                              Completed
                            </span>
                          )}

                          {/* Category */}
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full">
                            <Folder className="h-3 w-3 text-indigo-400" />
                            <span className="text-[10px]">{task.category}</span>
                          </span>

                          {/* Deadline */}
                          <span className={`inline-flex items-center gap-1 bg-slate-950 border px-2 py-0.5 rounded-full ${
                            task.status === 'missed'
                              ? 'text-red-400 border-red-950 bg-red-950/20'
                              : 'text-slate-400 border-slate-850'
                          }`}>
                            <Calendar className="h-3 w-3 text-cyan-400" />
                            <span>
                              {task.status === 'missed'
                                ? 'Deadline passed already'
                                : new Date(task.deadline).toLocaleString()}
                            </span>
                          </span>

                        {/* Duration */}
                        {task.estimatedMinutes > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3 text-amber-400" />
                            <span>{task.estimatedMinutes}m</span>
                          </span>
                        )}
                      </div>

                      {/* Subtask Checklists */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-850 space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Subtasks Checklist</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {task.subtasks.map((sub, idx) => (
                              <div key={sub._id || idx} className="flex items-center gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSubtask(task, idx)}
                                  className="text-slate-500 hover:text-slate-400"
                                >
                                  {sub.done ? (
                                    <CheckSquare className="h-4 w-4 text-brand-500" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </button>
                                <span className={sub.done ? 'line-through text-slate-500' : 'text-slate-300'}>
                                  {sub.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-semibold">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-750 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-850 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <span className="text-slate-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-750 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-850 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* CALENDAR VIEW MODE */
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
              
              {/* Calendar controls */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-brand-500" />
                  {getMonthName()}
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 bg-slate-900 border border-slate-750 rounded-lg hover:bg-slate-850 transition-colors text-slate-400 hover:text-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 bg-slate-900 border border-slate-750 rounded-lg hover:bg-slate-850 transition-colors text-slate-400 hover:text-slate-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {calendarLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
                  <p className="text-xs text-slate-400">Loading calendar days...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Grid Header */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Grid Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonthGrid().map((day, idx) => {
                      if (!day) {
                        return <div key={`empty-${idx}`} className="bg-slate-900/10 min-h-[90px] border border-transparent rounded-lg"></div>;
                      }

                      const dayDateStr = day.toDateString();
                      
                      // Match tasks due on this date (based on UTC/Local representation matching)
                      const dayTasks = calendarTasks.filter((t) => {
                        const taskDate = new Date(t.deadline);
                        return taskDate.toDateString() === dayDateStr;
                      });

                      return (
                        <div 
                          key={dayDateStr} 
                          className="bg-[#0d1527] border border-slate-850 hover:border-slate-700 min-h-[95px] p-2 rounded-lg flex flex-col justify-between transition-colors overflow-hidden"
                        >
                          <div className="text-xs font-bold text-slate-400 self-end">
                            {day.getDate()}
                          </div>
                          
                          {/* Inline Tasks summary */}
                          <div className="flex-1 mt-1 space-y-1 overflow-y-auto max-h-[60px] scrollbar-thin">
                            {dayTasks.map((t) => {
                              // color indicator based on riskScore temperature
                              const risk = t.aiMeta?.riskScore || 0;
                              const indicatorColor = risk >= 80 
                                ? 'bg-amber-500' 
                                : risk >= 40 
                                  ? 'bg-rose-500' 
                                  : 'bg-sky-400';

                              return (
                                <div 
                                  key={t._id} 
                                  className={`flex items-center gap-1 px-1 py-0.5 rounded text-[8px] truncate font-bold border ${
                                    t.status === 'done' 
                                      ? 'border-slate-900/40 text-slate-600 line-through bg-slate-950/20' 
                                      : 'border-slate-800 text-slate-300 bg-slate-950/40'
                                  }`}
                                  title={`${t.title} (Risk: ${risk}%)`}
                                >
                                  <span className={`h-1 w-1 rounded-full ${indicatorColor} flex-shrink-0`}></span>
                                  <span className="truncate">{t.title}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {showVoiceCapture && (
        <VoiceCapture
          onTaskCreated={() => {
            if (viewMode === 'list') fetchTasks();
            else fetchCalendarData();
          }}
          onClose={() => setShowVoiceCapture(false)}
        />
      )}

      {draftTask && (
        <DraftMessageModal
          task={draftTask}
          onClose={() => setDraftTask(null)}
        />
      )}

      {breakdownTask && (
        <AIBreakdownModal
          task={breakdownTask}
          onClose={() => setBreakdownTask(null)}
          onAccepted={() => {
            setBreakdownTask(null);
            fetchTasks();
          }}
        />
      )}

      {/* ── Edit Task Modal ──────────────────────────────────────────────── */}
      {editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-slate-800 bg-[#0d1527] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100">Edit Task</h2>
              </div>
              <button
                onClick={() => setEditTask(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</label>
                <input
                  type="text"
                  name="title"
                  value={editFormData.title}
                  onChange={handleEditChange}
                  required
                  className={`mt-1.5 w-full bg-[#070b14] border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35 ${
                    editErrors.title ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {editErrors.title && <p className="text-xs text-rose-400 mt-1">{editErrors.title}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  value={editFormData.description}
                  onChange={handleEditChange}
                  className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</label>
                  <select name="priority" value={editFormData.priority} onChange={handleEditChange}
                    className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                  <select name="category" value={editFormData.category} onChange={handleEditChange}
                    className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35">
                    <option value="personal">Personal</option>
                    <option value="assignment">Assignment</option>
                    <option value="meeting">Meeting</option>
                    <option value="bill">Bill</option>
                    <option value="interview">Interview</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</label>
                <input
                  type="datetime-local"
                  name="deadline"
                  value={editFormData.deadline}
                  onChange={handleEditChange}
                  className={`mt-1.5 w-full bg-[#070b14] border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35 ${
                    editErrors.deadline ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {editErrors.deadline && <p className="text-xs text-rose-400 mt-1">{editErrors.deadline}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration (min)</label>
                  <input
                    type="number"
                    name="estimatedMinutes"
                    min={0}
                    value={editFormData.estimatedMinutes}
                    onChange={handleEditChange}
                    className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Recurrence</label>
                  <select name="recurrence" value={editFormData.recurrence} onChange={handleEditChange}
                    className="mt-1.5 w-full bg-[#070b14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35">
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTask(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-350 text-sm font-bold hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTaskId}
        title="Delete Task"
        message="Are you sure you want to delete this task? It will be soft-deleted and can be recovered later, but scheduling priority will be released."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={executeDeleteTask}
        onCancel={() => setDeleteTaskId(null)}
      />
    </div>
  );
};


