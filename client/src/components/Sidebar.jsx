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
      <aside className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 flex flex-col min-h-screen text-slate-300 transition-colors duration-300">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-2">
          <Clock className="text-brand-500 h-6 w-6 animate-pulse" />
          <span className="font-extrabold text-lg bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
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
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30'
                    : 'hover:bg-slate-900 hover:text-slate-100'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout Action */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
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
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 border-t border-slate-850 flex items-center justify-around z-[100] px-2 shadow-2xl backdrop-blur-md transition-colors duration-300"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] font-semibold transition-all ${
                isActive
                  ? 'text-brand-400 font-bold'
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

