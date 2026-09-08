import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameStateProvider } from './contexts/GameStateContext';
import { AppLayout } from './layouts/AppLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Play } from './pages/Play';
import { Marketplace } from './pages/Marketplace';
import { Inventory } from './pages/Inventory';
import { Fusion } from './pages/Fusion';
import { Trades } from './pages/Trades';
import { Leaderboard } from './pages/Leaderboard';
import { Seasons } from './pages/Seasons';
import { HistoryPage } from './pages/History';
import { Profile } from './pages/Profile';
import { Boxes } from './pages/Boxes';
import { Collections } from './pages/Collections';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => {
    // Check initial window location if user typed /register, /login, /boxes or /collections
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (path === 'register') return 'register';
    if (path === 'login') return 'login';
    if (path === 'boxes' || path === 'caixas') return 'boxes';
    if (path === 'collections' || path === 'colecoes') return 'collections';
    return 'dashboard';
  });

  // Keep state in sync with authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      if (currentPage !== 'register' && currentPage !== 'login') {
        setCurrentPage('login');
      }
    } else {
      if (currentPage === 'login' || currentPage === 'register') {
        setCurrentPage('dashboard');
      }
    }
  }, [isAuthenticated, currentPage]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Public unauthenticated screens
  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return <Register onNavigate={handleNavigate} />;
    }
    return <Login onNavigate={handleNavigate} />;
  }

  // Authenticated screens protected by ProtectedRoute
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'play':
        return <Play onNavigate={handleNavigate} />;
      case 'boxes':
      case 'caixas':
        return <Boxes onNavigate={handleNavigate} />;
      case 'collections':
      case 'colecoes':
        return <Collections onNavigate={handleNavigate} />;
      case 'marketplace':
        return <Marketplace onNavigate={handleNavigate} />;
      case 'inventory':
        return <Inventory onNavigate={handleNavigate} />;
      case 'fusion':
        return <Fusion />;
      case 'trades':
        return <Trades />;
      case 'ranking':
      case 'leaderboard':
        return <Leaderboard />;
      case 'season':
      case 'seasons':
        return <Seasons />;
      case 'history':
        return <HistoryPage />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <ProtectedRoute onRedirectToLogin={() => handleNavigate('login')}>
      <AppLayout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderCurrentPage()}
      </AppLayout>
    </ProtectedRoute>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <GameStateProvider>
        <AppContent />
      </GameStateProvider>
    </AuthProvider>
  );
}
