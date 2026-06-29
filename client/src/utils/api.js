import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies along with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// We import the store dynamically to prevent circular dependencies
let authStore;
const getAuthStore = async () => {
  if (!authStore) {
    const module = await import('../store/authStore.js');
    authStore = module.useAuthStore;
  }
  return authStore;
};

// Request Interceptor: Attach JWT Access Token
api.interceptors.request.use(
  async (config) => {
    const store = await getAuthStore();
    const token = store.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Silent Refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint = requestUrl.includes('/api/auth/');
    const shouldSkipRefresh = originalRequest?.skipAuthRefresh || isAuthEndpoint;

    // Check if error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh) {
      // If we are already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const store = await getAuthStore();
        // Call backend refresh endpoint to get new access token
        // Note: we call this directly from axios to avoid interceptor recursion
        const refreshResponse = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true, skipAuthRefresh: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;
        
        // Update Zustand store
        store.getState().setAccessToken(newAccessToken);

        // Process the queue of pending requests with the new token
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token is expired or invalid, log out the user
        const store = await getAuthStore();
        store.getState().clearAuth();
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Redirect if on browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
