import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { loginSchema } from '../../../shared/schemas.js';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export const Login = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    // Validate using shared Zod schema
    const validationResult = loginSchema.safeParse(formData);
    if (!validationResult.success) {
      const fieldErrors = {};
      validationResult.error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setSubmitError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#090e1a] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-200 relative overflow-hidden">
      
      {/* Background Gradient Ornaments */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-indigo-900/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-900/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2.5 mb-8">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/10731/10731298.png" 
              className="h-9 w-9 object-contain filter drop-shadow-[0_0_8px_rgba(6,182,212,0.35)]" 
              alt="TaskPilot Logo" 
            />
            <span className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent font-display tracking-tight">
              TaskPilot
            </span>
          </Link>
        </div>

        {/* Card Form */}
        <div className="bg-[#0b101f] border border-slate-800 rounded-[28px] p-8 shadow-2xl relative overflow-hidden">
          
          {/* Top card subtle glow strip */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/20 via-violet-500/40 to-purple-500/20" />

          <h2 className="text-2xl font-bold tracking-tight text-center text-slate-100 font-display mb-8">
            Welcome Back
          </h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {submitError && (
              <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex items-start gap-3 text-red-300 text-xs leading-relaxed animate-fade-in">
                <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0 mt-0.5 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full rounded-xl border border-slate-800 bg-[#070b14] px-4 py-3 text-slate-100 placeholder-slate-600 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/35 text-sm transition-all"
                placeholder="example@site.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400 font-mono">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-800 bg-[#070b14] pl-4 pr-12 py-3 text-slate-100 placeholder-slate-600 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/35 text-sm transition-all"
                  placeholder="Minimum 6 character"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400 font-mono">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-full border border-transparent bg-violet-600 py-3 px-4 text-sm font-bold text-white shadow-lg shadow-violet-900/20 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0b101f] transition-all disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Register Redirection Link */}
          <div className="mt-8 text-center border-t border-slate-900 pt-6">
            <p className="text-xs text-slate-500">
              New to TaskPilot?{' '}
              <Link to="/register" className="font-bold text-violet-400 hover:text-violet-300 transition-colors">
                Create Account
              </Link>
            </p>
          </div>

        </div>

        {/* Flaticon Attribution footer */}
        <p className="text-[9px] text-slate-600 uppercase tracking-widest text-center mt-6">
          Logo courtesy of{' '}
          <a 
            href="https://www.flaticon.com/free-icons/robotic-process-automation" 
            title="robotic process automation icons" 
            className="hover:underline hover:text-slate-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            zero_wing - Flaticon
          </a>
        </p>

      </div>
    </div>
  );
};
