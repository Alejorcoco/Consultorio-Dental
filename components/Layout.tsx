
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/db';
import { 
  Home, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  Stethoscope // New Icon
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false); // New state for hover interaction
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    setCustomLogo(db.getLogo());
  }, []);

  // Logic: Sidebar is visually expanded if it's NOT collapsed OR if it IS collapsed but currently hovered
  const isVisuallyExpanded = !isSidebarCollapsed || isSidebarHovered;

  // Updated: Modern Graphic "CT" Logo (Teal Gradient)
  const CTLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo_grad_layout" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" /> {/* Teal-400 */}
            <stop offset="100%" stopColor="#0f766e" /> {/* Teal-700 */}
        </linearGradient>
        <filter id="shadow_layout" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15"/>
        </filter>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="100" height="100" rx="22" fill="white" />
      
      {/* Logo Group */}
      <g filter="url(#shadow_layout)">
          {/* C Shape - Dynamic Curve */}
          <path 
            d="M 80 30 C 74 20 60 15 45 15 C 22 15 12 35 12 55 C 12 78 28 90 50 90 C 68 90 80 80 85 65" 
            stroke="url(#logo_grad_layout)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            fill="none" 
          />
          {/* T Shape - Nested */}
          <path 
            d="M 42 38 H 82 M 62 38 V 75" 
            stroke="url(#logo_grad_layout)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            fill="none" 
          />
      </g>
    </svg>
  );

  const LogoComponent = ({ size = 26 }: { size?: number }) => {
      if (customLogo) {
          return <img src={customLogo} alt="Logo" style={{ width: size, height: size, objectFit: 'contain' }} />;
      }
      return <CTLogo size={size} />;
  };

  const NavItem = ({ view, icon: Icon, label }: { view: string; icon: any; label: string }) => (
    <button
      onClick={() => {
        onNavigate(view);
        setIsMobileMenuOpen(false);
      }}
      title={!isVisuallyExpanded ? label : ''}
      className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all overflow-hidden whitespace-nowrap group ${
        currentView === view 
          ? 'bg-primary text-white shadow-lg shadow-primary/30' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      <div className="min-w-[24px] flex justify-center">
        <Icon size={22} strokeWidth={currentView === view ? 2.5 : 2} />
      </div>
      <span className={`font-medium transition-all duration-300 ${!isVisuallyExpanded ? 'opacity-0 w-0 translate-x-10' : 'opacity-100 w-auto translate-x-0'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed h-full z-20 transition-all duration-500 ease-in-out ${
          isVisuallyExpanded ? 'w-72 shadow-2xl' : 'w-24'
        }`}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center h-24 relative">
          
          <div className={`flex items-center gap-3 transition-all duration-500 ${!isVisuallyExpanded ? 'justify-center w-full' : ''}`}>
            {/* Logo Container - Adjusted padding for larger look */}
            <div className={`bg-gradient-to-br from-primary to-teal-700 p-1.5 rounded-xl text-white shrink-0 shadow-md transition-all duration-500 ${!isVisuallyExpanded ? 'scale-110' : ''}`}>
               <LogoComponent size={!isVisuallyExpanded ? 32 : 36} />
            </div>
            
            {/* Text (Hidden when collapsed) */}
            <div className={`min-w-[180px] transition-all duration-500 overflow-hidden whitespace-nowrap ${!isVisuallyExpanded ? 'w-0 opacity-0 absolute' : 'w-auto opacity-100 relative'}`}>
               <h1 className="font-bold text-sm text-slate-800 dark:text-white tracking-tight leading-tight">Consultorio<br/>Odontológico Taboada</h1>
               <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Sistema de Gestión</p>
            </div>
          </div>

          <button 
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className={`absolute -right-4 top-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-2 rounded-full text-slate-500 hover:text-primary hover:border-primary shadow-sm transition-all z-50 transform hover:scale-110`}
             title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
             {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden pt-6">
          <NavItem view="dashboard" icon={Home} label="Inicio" />
          <NavItem view="patients" icon={Users} label="Pacientes" />
          <NavItem view="diagnosis" icon={Stethoscope} label="Diagnóstico" />
          <NavItem view="finance" icon={CreditCard} label="Pagos y Finanzas" />
          <NavItem view="appointments" icon={Calendar} label="Agenda" />
          
          {/* Config link for Principals and Doctors */}
          {(user.role === UserRole.PRINCIPAL || user.role === UserRole.DOCTOR) && (
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                <p className={`px-4 text-[10px] font-bold text-slate-400 uppercase mb-2 transition-opacity duration-300 ${!isVisuallyExpanded ? 'opacity-0 h-0' : 'opacity-100'}`}>Sistema</p>
                <NavItem view="settings" icon={Settings} label="Configuración" />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <div className={`flex items-center gap-3 px-3 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl mb-2 overflow-hidden ${!isVisuallyExpanded ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-200 font-bold text-xs shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${!isVisuallyExpanded ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user.role === UserRole.PRINCIPAL ? 'Director' : user.role === UserRole.DOCTOR ? 'Doctor' : 'Staff'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            title="Cerrar Sesión"
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors overflow-hidden whitespace-nowrap ${!isVisuallyExpanded ? 'justify-center' : ''}`}
          >
            <LogOut size={20} />
            <span className={`font-medium transition-all duration-300 ${!isVisuallyExpanded ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-white dark:bg-slate-800 z-20 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center transition-colors duration-300">
         <div className="flex items-center gap-2">
            <div className="bg-primary p-1 rounded text-white">
               <LogoComponent size={24} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">Consultorio Odontológico Taboada</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-300">
           <Menu size={24} />
         </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-white dark:bg-slate-800 pt-20 px-4 space-y-2">
          <NavItem view="dashboard" icon={Home} label="Inicio" />
          <NavItem view="patients" icon={Users} label="Pacientes" />
          <NavItem view="diagnosis" icon={Stethoscope} label="Diagnóstico" />
          <NavItem view="finance" icon={CreditCard} label="Pagos y Finanzas" />
          <NavItem view="appointments" icon={Calendar} label="Agenda" />
          {(user.role === UserRole.PRINCIPAL || user.role === UserRole.DOCTOR) && (
            <NavItem view="settings" icon={Settings} label="Configuración" />
          )}
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl mt-8"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main 
        className={`flex-1 min-h-screen pt-20 lg:pt-0 transition-all duration-500 ease-in-out ${
           isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'
        }`}
      >
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                 <LogOut size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Cerrar Sesión?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                Asegúrese de haber guardado todos los cambios antes de salir del sistema.
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setShowLogoutConfirm(false)}
                   className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={onLogout}
                   className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 shadow-lg"
                 >
                   Sí, Salir
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
