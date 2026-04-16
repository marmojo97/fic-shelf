import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import MyShelf from './pages/MyShelf.jsx';
import Discover from './pages/Discover.jsx';
import Stats from './pages/Stats.jsx';
import RecLists from './pages/RecLists.jsx';
import Profile from './pages/Profile.jsx';
import ShareTarget from './pages/ShareTarget.jsx';
import Changelog from './pages/Changelog.jsx';
import Admin from './pages/Admin.jsx';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-txt-muted text-sm">Loading your shelf...</p>
        </div>
      </div>
    );
  }

  // Admin panel is always accessible regardless of user session
  // (it has its own auth)
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      {!user ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/shelf" replace />} />
                <Route path="/shelf" element={<MyShelf />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/reclists" element={<RecLists />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/share-target" element={<ShareTarget />} />
                <Route path="*" element={<Navigate to="/shelf" replace />} />
              </Routes>
            </Layout>
          }
        />
      )}
    </Routes>
  );
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
    }
  }, []);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ServiceWorkerRegistrar />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
