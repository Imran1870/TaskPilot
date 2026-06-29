import React from 'react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore.js';
import { Sun, Moon, Brain, ShieldAlert, Mic, CheckCircle, ArrowRight } from 'lucide-react';

export const Home = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-[#090e1a] text-slate-100 flex flex-col justify-between transition-colors duration-300 relative overflow-hidden">
      
      {/* Background Gradient Ornaments (Touch of gradient matching user visual request) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-900/20 via-purple-900/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-900/10 via-slate-900/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-2.5">
          <img 
            src="https://cdn-icons-png.flaticon.com/512/10731/10731298.png" 
            className="h-10 w-10 object-contain" 
            alt="TaskPilot Logo" 
          />
          <span className="font-extrabold text-xl bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent font-display tracking-tight">
            TaskPilot
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-800 bg-[#0d1527] text-slate-400 hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Login Link */}
          <Link
            to="/login"
            className="px-5 py-2 rounded-xl border border-slate-800 bg-[#0d1527] hover:bg-slate-900 text-slate-300 hover:text-white text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Hero Section (Middle) */}
      <main className="relative z-10 max-w-5xl w-full mx-auto px-6 py-16 flex flex-col items-center text-center gap-8 flex-1 justify-center">
        
        {/* Robotic Process Automation Brand Banner */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/25 bg-cyan-950/15 text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          Autonomous Co-Pilot Active
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-cyan-500 via-violet-500 to-indigo-600 bg-clip-text text-transparent font-display tracking-tight leading-tight max-w-3xl">
          Take control of your tasks. Autonomously.
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl leading-relaxed font-body">
          TaskPilot is an intelligent co-pilot that proactively watches your deadlines, habits, and calendar. It automatically flags risks, plans task breakdowns, and helps you communicate before it's too late.
        </p>

        {/* Get Started Button */}
        <div className="mt-2">
          <Link
            to="/register"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-900/40 text-white font-extrabold text-base transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-violet-500/30"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* 3 Main Features Shown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl text-left">
          
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl border border-slate-850 bg-[#0d1527]/55 hover:border-slate-700 transition-colors duration-300 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">Observe & Act</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                TaskPilot tracks deadlines deterministically and triggers Gemini reasoning checks. Urgency scores update in real time with precise transparency logs.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl border border-slate-850 bg-[#0d1527]/55 hover:border-slate-700 transition-colors duration-300 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">Anxiety-Safe Rescue</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                If a deadline falls in hazard levels, enters Rescue Mode cockpit with Pomodoro tracking, priority deferrals, and custom extension-request generators.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl border border-slate-850 bg-[#0d1527]/55 hover:border-slate-700 transition-colors duration-300 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">Gemini Voice Capture</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Dictate tasks naturally. Gemini extracts details to auto-populate title, estimate, priority, and categories directly into the database.
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* Footer & Attribution */}
      <footer className="relative z-10 py-8 border-t border-slate-900/60 max-w-7xl w-full mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
        <p>© {new Date().getFullYear()} TaskPilot. All systems operational.</p>
        <p className="text-center sm:text-right">
          Logo courtesy of{' '}
          <a 
            href="https://www.flaticon.com/free-icons/robotic-process-automation" 
            title="robotic process automation icons" 
            className="text-slate-400 hover:text-cyan-400 underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            zero_wing - Flaticon
          </a>
        </p>
      </footer>

    </div>
  );
};
