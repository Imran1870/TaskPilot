import { create } from 'zustand';
import axios from 'axios';
import { api } from '../utils/api.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // starts loading while we check session

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
  
  clearAuth: () => set({ 
    user: null, 
    accessToken: null, 
    isAuthenticated: false, 
    isLoading: false 
  }),

  register: async (name, email, password, timezone) => {
    try {
      const response = await api.post('/api/auth/register', { 
        name, 
        email, 
        password,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone 
      });
      const { user, accessToken } = response.data;
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Registration failed';
      return { success: false, error: errorMsg };
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { user, accessToken } = response.data;
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Login failed';
      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error on server', error);
    } finally {
      get().clearAuth();
    }
  },

  // Perform silent refresh on application load
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const { accessToken } = response.data;
      set({ accessToken, isAuthenticated: true, isLoading: false });
      
      try {
        const userRes = await api.get('/api/auth/me');
        set({ user: userRes.data.user, isAuthenticated: true, isLoading: false });
      } catch (err) {
        set({ isAuthenticated: true, isLoading: false });
      }
      return { success: true };
    } catch (error) {
      get().clearAuth();
      return { success: false };
    }
  }
}));
