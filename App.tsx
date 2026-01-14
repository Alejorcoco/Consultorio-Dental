
import React, { useState, useEffect } from 'react';
import { User, Patient } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PatientsManager from './components/PatientsManager';
import FinanceManager from './components/FinanceManager';
import Settings from './components/Settings';
import Agenda from './components/Agenda';
import DiagnosticManager from './components/DiagnosticManager'; // New Component
import { db } from './services/db';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedPatientForDiagnosis, setSelectedPatientForDiagnosis] = useState<Patient | null>(null);

  useEffect(() => {
    // Default to LIGHT mode as requested, ignore system pref for now unless stored explicitly
    if (localStorage.theme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleNavigate = (view: string, data?: any) => {
      if (view === 'diagnosis' && data) {
          setSelectedPatientForDiagnosis(data);
      }
      setCurrentView(view);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    // Handle specific route logic
    if (currentView === 'patients' || currentView === 'patients-new') {
      return (
        <PatientsManager 
          onNavigate={handleNavigate} 
          autoOpenForm={currentView === 'patients-new'} 
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} onNavigate={handleNavigate} />;
      case 'finance':
        return <FinanceManager />;
      case 'settings':
        return <Settings user={user} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
      case 'appointments':
        return <Agenda />;
      case 'diagnosis':
        return <DiagnosticManager user={user} initialPatient={selectedPatientForDiagnosis} />;
      default:
        return <Dashboard user={user} onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout} currentView={currentView} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
};

export default App;
