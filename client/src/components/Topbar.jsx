import React, { useEffect } from 'react';
import { Globe, User, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useThemeStore } from '../store/themeStore.js';

export const Topbar = () => {
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const initTheme = useThemeStore((state) => state.initTheme);

  // Initialize theme class on boot
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-100">Workspace</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800 transition-all duration-200"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" />
          )}
        </button>

        {user && (
          <>
            {/* Timezone Info */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-800/40">
              <Globe className="h-3.5 w-3.5 text-brand-400" />
              <span>{user.timezone || 'UTC'}</span>
            </div>

            {/* Profile Summary */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-sm font-medium text-slate-200">{user.name}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-semibold text-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

