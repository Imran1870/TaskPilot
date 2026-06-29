import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Layout } from './components/Layout.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Home } from './pages/Home.jsx';
import { ToastContainer } from './components/ToastContainer.jsx';

// Route-based code splitting (Performance optimization)
const Tasks = React.lazy(() => import('./pages/Tasks.jsx').then(module => ({ default: module.Tasks })));
const Habits = React.lazy(() => import('./pages/Habits.jsx').then(module => ({ default: module.Habits })));
const Insights = React.lazy(() => import('./pages/Insights.jsx').then(module => ({ default: module.Insights })));
const CalendarConnect = React.lazy(() => import('./pages/CalendarConnect.jsx').then(module => ({ default: module.CalendarConnect })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      <p className="text-xs">Optimizing layout engine...</p>
    </div>
  </div>
);

// Auth-based route helpers
const HomeRoute = () => {
  const user = useAuthStore((state) => state.user);
  return user ? <Navigate to="/dashboard" replace /> : <Home />;
};

const FallbackRoute = () => {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={user ? "/dashboard" : "/"} replace />;
};

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Check if user has an active session cookie on boot
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      const setupPushNotifications = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.log('Push messaging is not supported in this browser.');
          return;
        }

        try {
          // 1. Request notification permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Notification permission denied.');
            return;
          }

          // 2. Register service worker
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', registration.scope);

          // 3. Fetch VAPID public key
          const { api: apiHelper } = await import('./utils/api.js');
          const { data } = await apiHelper.get('/api/agent/vapid-key');
          if (!data.success || !data.publicKey) {
            console.log('Failed to fetch VAPID public key.');
            return;
          }

          // Convert VAPID key
          const padding = '='.repeat((4 - (data.publicKey.length % 4)) % 4);
          const base64 = (data.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          const applicationServerKey = outputArray;

          // 4. Clean up any existing push subscription to prevent key mismatch errors
          try {
            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) {
              await existingSub.unsubscribe();
              console.log('Cleared existing push subscription');
            }
          } catch (subErr) {
            console.warn('Error unsubscribing existing push registration:', subErr.message);
          }

          // 5. Subscribe
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
          });

          // 5. Send to backend
          await apiHelper.post('/api/agent/subscribe-push', { subscription });
          console.log('User successfully subscribed to push notifications.');

        } catch (err) {
          console.error('Error setting up push notifications:', err.message);
        }
      };
      setupPushNotifications();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
          <p className="text-sm font-medium text-slate-400">Initializing TaskPilot...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Dashboard/App routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={
                <Suspense fallback={<PageLoader />}>
                  <Tasks />
                </Suspense>
              } />
              <Route path="/habits" element={
                <Suspense fallback={<PageLoader />}>
                  <Habits />
                </Suspense>
              } />
              <Route path="/insights" element={
                <Suspense fallback={<PageLoader />}>
                  <Insights />
                </Suspense>
              } />
              <Route path="/calendar" element={
                <Suspense fallback={<PageLoader />}>
                  <CalendarConnect />
                </Suspense>
              } />
            </Route>
          </Route>

          {/* Fallback routing */}
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

