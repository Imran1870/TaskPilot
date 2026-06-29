import React, { useState } from 'react';
import { TrendingUp, Clock, AlertTriangle, Activity, BarChart2, Lightbulb, Loader2, Sparkles, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <BarChart2 className="h-8 w-8 text-brand-500" />
              Productivity Insights
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Analyze your behavioral patterns, time estimates, and procrastination metrics.
            </p>
          </div>

          <button
            onClick={fetchInsights}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-900/30 flex-shrink-0"
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
          <div className="border border-amber-800/40 bg-amber-950/20 rounded-xl p-5 flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">On-Demand Analysis</p>
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
                <div key={n} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/10 h-24"></div>
              ))}
            </div>
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 h-32"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 h-64"></div>
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/10 h-64"></div>
            </div>
          </div>
        )}

        {/* Results */}
        {hasLoaded && !loading && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Completed (30d)', value: overview.totalCompleted || 0, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                { label: 'Missed Deadlines', value: overview.totalMissed || 0, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                { label: 'Active Tasks', value: overview.totalActive || 0, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { label: 'Overall Miss Rate', value: `${overview.overallMissRate || 0}%`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              ].map((stat, i) => (
                <div key={i} className={`p-5 rounded-2xl border ${stat.bg} ${stat.border} transition-all duration-300 hover:scale-[1.02]`}>
                  <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">{stat.label}</p>
                  <p className={`text-3xl font-extrabold mt-2 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* AI Nuggets & Suggestions */}
            {patternSummary && (
              <div className="p-6 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/20 to-slate-900/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-200">AI Pattern Diagnostics</h3>
                    <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                      {patternSummary.procrastinationCategories?.length > 0 && (
                        <li>
                          You tend to delay starting tasks in: <strong className="text-brand-400">{patternSummary.procrastinationCategories.join(', ')}</strong>.
                        </li>
                      )}
                      {patternSummary.worstEstimationCategory && (
                        <li>
                          You regularly underestimate time requirements for <strong className="text-amber-400">{patternSummary.worstEstimationCategory}</strong> tasks (by around {patternSummary.estimationAccuracy}%).
                        </li>
                      )}
                      <li>
                        Your peak focus hours are identified as <strong className="text-indigo-400">{patternSummary.bestFocusHours?.join(', ')}</strong>.
                      </li>
                      <li>
                        Analyzed history of {patternSummary.totalTasksAnalyzed} tasks to customize active suggestions.
                      </li>
                    </ul>
                    {/* Agent feedback loop callout */}
                    <div className="mt-3 flex items-start gap-2 bg-brand-900/20 border border-brand-700/30 rounded-lg px-3 py-2">
                      <Activity className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        <strong className="text-brand-300">→ These insights feed directly into the Autonomous Agent.</strong>{' '}
                        On each scheduled tick, the agent weights tasks using your procrastination patterns, estimation errors, and focus-hour data — so it learns from your history, not just your deadlines.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estimation Accuracy */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                  <Clock className="h-5 w-5 text-indigo-400" />
                  Estimation Accuracy by Category
                </h3>
                <p className="text-xs text-slate-500">Shows how much longer tasks actually take compared to estimates.</p>
                
                {insights?.estimationAccuracy?.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No estimation history found yet.</p>
                ) : (
                  <div className="space-y-4 pt-2">
                    {insights?.estimationAccuracy?.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize font-medium text-slate-300">{item.category}</span>
                          <span className="text-indigo-400 font-semibold">{item.underestimatePercent > 0 ? `+${item.underestimatePercent}%` : 'On track'}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              item.underestimatePercent > 40 ? 'bg-red-500' : item.underestimatePercent > 15 ? 'bg-amber-500' : 'bg-indigo-500'
                            }`} 
                            style={{ width: `${Math.min(100, Math.max(10, item.underestimatePercent))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Est: {item.avgEstimated}m</span>
                          <span>Actual: {item.avgActual}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Procrastination metrics */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                  <Activity className="h-5 w-5 text-orange-400" />
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
                          <span className="capitalize font-medium text-slate-300">{item.category}</span>
                          <span className="text-orange-400 font-semibold">{item.avgDaysToStart} days</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800">
                          <div 
                            className="h-2 rounded-full bg-orange-500" 
                            style={{ width: `${Math.min(100, (item.avgDaysToStart / 7) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">Based on {item.taskCount} tasks</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Miss rate by Priority */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Deadline Breach Rate by Priority
              </h3>
              
              {insights?.missRates?.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No completion/miss history available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  {insights?.missRates?.map((item) => (
                    <div key={item.priority} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.priority}</span>
                        <p className="text-2xl font-extrabold text-slate-200 mt-1">{item.missRate}%</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 mt-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.priority === 'critical' || item.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${item.missRate}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2">{item.missed} missed out of {item.total} total</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
