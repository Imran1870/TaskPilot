import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, LogOut, Clock, Flame, TrendingUp, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

export const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/habits', label: 'Habits', icon: Flame },
    { to: '/insights', label: 'Insights', icon: TrendingUp },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-[#0d1527] border-r border-slate-800 flex flex-col min-h-screen text-slate-300 transition-colors duration-300">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-2">
          <Clock className="text-cyan-400 h-5 w-5" />
          <span className="font-extrabold text-lg bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent font-display tracking-tight">
            TaskPilot
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                    : 'hover:bg-slate-900/60 hover:text-slate-100'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout Action */}
        <div className="p-4 border-t border-slate-850">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (hidden on desktop) */}
      <nav 
        role="navigation"
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0d1527]/95 border-t border-slate-850 flex items-center justify-around z-[100] px-2 shadow-2xl backdrop-blur-md transition-colors duration-300"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] font-bold transition-all focus:outline-none ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-500 hover:text-slate-350'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};
