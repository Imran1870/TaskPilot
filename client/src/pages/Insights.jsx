import React, { useState } from 'react';
import { TrendingUp, Clock, AlertTriangle, Activity, BarChart2, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { api } from '../utils/api.js';
import { useToastStore } from '../store/toastStore.js';

export const Insights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/insights');
      setData(res.data);
      setHasLoaded(true);
    } catch (err) {
      addToast(err?.response?.data?.error?.message || 'Failed to load insights', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { insights, patternSummary } = data || {};
  const overview = insights?.overview || {};

  return (
    <div className="min-h-screen bg-[#090e1a] p-6 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2 font-display">
              <BarChart2 className="h-8 w-8 text-cyan-400" />
              Productivity Insights
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Analyze your behavioral patterns, time estimates, and procrastination metrics.
            </p>
          </div>

          <button
            onClick={fetchInsights}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-bold transition-colors shadow-lg shadow-cyan-900/30 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? 'Analyzing...' : hasLoaded ? 'Refresh Analysis' : 'Analyze My Patterns'}
          </button>
        </div>

        {/* API Usage Warning */}
        {!hasLoaded && (
          <div className="border border-amber-800/30 bg-amber-950/15 rounded-xl p-5 flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-300">On-Demand Analysis</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Insights are generated on-demand to save your Gemini API quota. Click <strong className="text-amber-300">Analyze My Patterns</strong> above to run the analysis. 
                Results are purely database aggregations — no Gemini tokens are used for this page. You can refresh as often as needed.
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-5 rounded-2xl border border-slate-800 bg-[#0d1527]/30 h-24"></div>
              ))}
            </div>
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0d1527]/30 h-32"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-slate-800 bg-[#0d1527]/30 h-64"></div>
              <div className="p-6 rounded-2xl border border-slate-800 bg-[#0d1527]/30 h-64"></div>
            </div>
          </div>
        )}

        {/* Results */}
        {hasLoaded && !loading && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Completed (30d)', value: overview.totalCompleted || 0, color: 'text-emerald-400', border: 'border-slate-800' },
                { label: 'Missed Deadlines', value: overview.totalMissed || 0, color: 'text-rose-400', border: 'border-slate-800' },
                { label: 'Active Tasks', value: overview.totalActive || 0, color: 'text-sky-400', border: 'border-slate-800' },
                { label: 'Overall Miss Rate', value: `${overview.overallMissRate || 0}%`, color: 'text-amber-400', border: 'border-slate-800' },
              ].map((stat, i) => (
                <div key={i} className={`p-5 rounded-2xl border bg-[#0d1527] ${stat.border} transition-all duration-300 hover:scale-[1.01] shadow-md shadow-slate-950/50`}>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">{stat.label}</p>
                  <p className={`text-3xl font-extrabold mt-2 ${stat.color} font-display`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* AI Nuggets & Suggestions */}
            {patternSummary && (
              <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/10 to-[#0d1527] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-200 font-display">AI Pattern Diagnostics</h3>
                    <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                      {patternSummary.procrastinationCategories?.length > 0 && (
                        <li>
                          You tend to delay starting tasks in: <strong className="text-cyan-400">{patternSummary.procrastinationCategories.join(', ')}</strong>.
                        </li>
                      )}
                      {patternSummary.worstEstimationCategory && (
                        <li>
                          You regularly underestimate time requirements for <strong className="text-rose-400">{patternSummary.worstEstimationCategory}</strong> tasks (by around {patternSummary.estimationAccuracy}%).
                        </li>
                      )}
                      <li>
                        Your peak focus hours are identified as <strong className="text-sky-400">{patternSummary.bestFocusHours?.join(', ')}</strong>.
                      </li>
                      <li>
                        Analyzed history of {patternSummary.totalTasksAnalyzed} tasks to customize active suggestions.
                      </li>
                    </ul>
                    {/* Agent feedback loop callout */}
                    <div className="mt-3 flex items-start gap-2 bg-[#070b14]/50 border border-slate-800 rounded-lg px-3 py-2">
                      <Activity className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        <strong className="text-cyan-300">→ Feedback Loop:</strong>{' '}
                        On each scheduled tick, the TaskPilot agent weights tasks using your historical patterns, estimation errors, and focus-hour data to prioritize your queue.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estimation Accuracy */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-[#0d1527] space-y-4 shadow-md shadow-slate-950/50">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200 font-display">
                  <Clock className="h-5 w-5 text-cyan-400" />
                  Estimation Accuracy by Category
                </h3>
                <p className="text-xs text-slate-500">Shows how much longer tasks actually take compared to estimates.</p>
                
                {insights?.estimationAccuracy?.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No estimation history found yet.</p>
                ) : (
                  <div className="space-y-4 pt-2">
                    {insights?.estimationAccuracy?.map((item) => {
                      const pct = item.underestimatePercent;
                      // Temperature gradient mapping
                      const barColor = pct >= 40 
                        ? 'bg-amber-500' 
                        : pct >= 15 
                          ? 'bg-rose-500' 
                          : 'bg-sky-400';

                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize font-semibold text-slate-300">{item.category}</span>
                            <span className="text-slate-400 font-bold">{pct > 0 ? `+${pct}%` : 'On track'}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-900 border border-slate-850">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                              style={{ width: `${Math.min(100, Math.max(10, pct))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 font-mono">
                            <span>Est: {item.avgEstimated}m</span>
                            <span>Actual: {item.avgActual}m</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Procrastination metrics */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-[#0d1527] space-y-4 shadow-md shadow-slate-950/50">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200 font-display">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  Procrastination Index
                </h3>
                <p className="text-xs text-slate-500">Average time elapsed (in days) from task creation to progress update.</p>

                {insights?.procrastination?.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No task update history found yet.</p>
                ) : (
                  <div className="space-y-4 pt-2">
                    {insights?.procrastination?.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize font-semibold text-slate-300">{item.category}</span>
                          <span className="text-cyan-400 font-bold font-mono">{item.avgDaysToStart} days</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-900 border border-slate-850">
                          <div 
                            className="h-full rounded-full bg-cyan-500" 
                            style={{ width: `${Math.min(100, (item.avgDaysToStart / 7) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Based on {item.taskCount} tasks</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Miss rate by Priority */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-[#0d1527] space-y-4 shadow-md shadow-slate-950/50">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200 font-display">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Deadline Breach Rate by Priority
              </h3>
              
              {insights?.missRates?.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No completion/miss history available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  {insights?.missRates?.map((item) => {
                    const isHigh = item.priority === 'critical' || item.priority === 'high';
                    const barColor = item.priority === 'critical'
                      ? 'bg-amber-500'
                      : isHigh
                        ? 'bg-rose-500'
                        : 'bg-sky-400';

                    return (
                      <div key={item.priority} className="p-4 rounded-xl bg-[#070b14] border border-slate-850 flex flex-col justify-between hover:border-slate-700 transition-colors">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.priority}</span>
                          <p className="text-2xl font-extrabold text-slate-200 mt-1 font-display">{item.missRate}%</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-900 mt-3 overflow-hidden border border-slate-850">
                          <div 
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${item.missRate}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 mt-2 block">{item.missed} missed / {item.total} total</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
