import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, LogOut, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../utils/api.js';
import { useToastStore } from '../store/toastStore.js';
import { ConfirmModal } from '../components/ConfirmModal.jsx';

export const CalendarConnect = () => {
  const [status, setStatus] = useState({ connected: false, connectedEmail: null, connectedAt: null });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  // Parse URL query params to check for callback redirections
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      addToast('Successfully connected Google Calendar!', 'success');
      // clear queries
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      addToast(`Calendar authorization failed: ${params.get('error')}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addToast]);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/calendar/status');
      setStatus(data);
      if (data.connected) {
        fetchEvents();
      }
    } catch {
      addToast('Failed to check calendar connection status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const { data } = await api.get('/calendar/events?daysAhead=7');
      setEvents(data.events || []);
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to fetch calendar events', 'error');
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const { data } = await api.get('/calendar/auth-url');
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      addToast('Failed to start Google authentication', 'error');
    }
  };

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const executeDisconnect = async () => {
    setShowDisconnectConfirm(false);
    setDisconnecting(true);
    try {
      await api.delete('/calendar/disconnect');
      setStatus({ connected: false, connectedEmail: null, connectedAt: null });
      setEvents([]);
      addToast('Google Calendar disconnected successfully', 'info');
    } catch {
      addToast('Failed to disconnect Google Calendar', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100 animate-pulse">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 bg-slate-900 rounded w-1/3"></div>
            <div className="h-4 bg-slate-900 rounded w-1/2"></div>
          </div>
          {/* Connection Status Box Skeleton */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 h-28"></div>
          {/* Events List Skeleton */}
          <div className="space-y-3">
            <div className="h-6 bg-slate-900 rounded w-1/4"></div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 rounded-xl border border-slate-800 bg-slate-900/10 h-16"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        title="Disconnect Google Calendar"
        message="Are you sure you want to disconnect Google Calendar? The AI agent will lose all context of your scheduling windows, classes, and meetings."
        confirmText="Disconnect"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={executeDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            <Calendar className="h-8 w-8 text-brand-500" />
            Google Calendar Sync
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Connect your calendar so that the AI agent does not suggest scheduling tasks during busy periods.
          </p>
        </div>

        {/* Connection Status Panel */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              {status.connected ? (
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-400">
                  <Calendar className="h-6 w-6" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-slate-200">
                  {status.connected ? 'Google Calendar Connected' : 'Google Calendar Not Connected'}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {status.connected 
                    ? `Connected to ${status.connectedEmail || 'your Google account'}` 
                    : 'The agent needs calendar context to verify your actual availability.'}
                </p>
                {status.connectedAt && (
                  <p className="text-xs text-slate-500 mt-1">
                    Connected on: {new Date(status.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              {status.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-950 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-semibold text-sm transition-all"
                >
                  {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition-all shadow-lg shadow-brand-900/35"
                >
                  <Calendar className="h-4 w-4" />
                  Connect Google Calendar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Events Block */}
        {status.connected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200">Busy Windows (Upcoming 7 Days)</h3>
              <button 
                onClick={fetchEvents} 
                disabled={eventsLoading}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${eventsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-800 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">No events found in this window.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {events.map((event) => {
                  const startStr = new Date(event.start).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const endStr = new Date(event.end).toLocaleString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={event.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/10 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{event.summary}</p>
                        <p className="text-xs text-slate-400 mt-1">{startStr} – {endStr}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                        Busy Window
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
