
import React, { useEffect, useState, useRef } from 'react';
import { User, UserRole, Appointment, Reminder, Patient, Treatment } from '../types';
import { db } from '../services/db';
import PaymentModal from './PaymentModal';
import IntegralAttentionModal from './IntegralAttentionModal';
import { PatientForm } from './PatientForm';
import TreatmentModal from './TreatmentModal'; // Imported
import { 
  Users, Calendar, DollarSign, UserPlus, CreditCard, 
  Clock, Bell, Plus, Trash2, CheckCircle2, Circle, Activity, 
  History, Stethoscope, Search, Zap, CalendarRange, BadgeDollarSign, ChevronRight,
  HelpCircle, Info, X, CalendarPlus, XCircle, MousePointerClick, Lock, Unlock
} from 'lucide-react';

interface DashboardProps {
  user: User;
  onNavigate: (view: string, data?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [greeting, setGreeting] = useState('');
  // Fix: Initial state matches DashboardStats from db + computed fields
  const [stats, setStats] = useState({ 
    totalIncome: 0, 
    totalPatients: 0, 
    appointmentsToday: 0, 
    pendingAppointments: 0,
    monthlyIncome: 0, 
    dailyIncome: 0 
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [showAddReminder, setShowAddReminder] = useState(false);
  
  // Widget State
  const [activeWidgetTab, setActiveWidgetTab] = useState<'appointments' | 'recent'>('appointments');
  const [recentTreated, setRecentTreated] = useState<{patient: Patient, lastTreatment: Treatment}[]>([]);

  // Modals & Search
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false); // Reuse Treatment Modal logic
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Actions
  const [selectedPatientForAttention, setSelectedPatientForAttention] = useState<Patient | null>(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  
  // Appointment Attention
  const [appointmentToAttend, setAppointmentToAttend] = useState<{patient: Patient, id: string, procedure: string} | null>(null);

  // Time State (24h UTC-4)
  const [currentTime, setCurrentTime] = useState(db.getNowLaPaz());
  const [isClinicOpen, setIsClinicOpen] = useState(false);

  // Cancellation State
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [animatingIds, setAnimatingIds] = useState<string[]>([]); // IDs being animated out

  const loadData = () => {
    const allStats = db.getStats();
    
    // Calculate Specific Incomes
    const allPayments = db.getPayments().filter(p => p.status !== 'cancelled');
    const now = db.getNowLaPaz();
    
    const monthlyIncome = allPayments.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, curr) => acc + curr.amount, 0);

    const dailyIncome = allPayments.filter(p => {
        const d = new Date(p.date);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, curr) => acc + curr.amount, 0);

    setStats({ 
        ...allStats, 
        monthlyIncome, 
        dailyIncome 
    });

    setAppointments(db.getAppointments());
    
    // Sort reminders: Uncompleted (false/0) first, Completed (true/1) last
    const sortedReminders = [...db.getReminders()].sort((a, b) => Number(a.completed) - Number(b.completed));
    setReminders(sortedReminders);
    
    setRecentTreated(db.getRecentTreatedPatients());
  };

  useEffect(() => {
    const checkStatus = () => {
        const now = db.getNowLaPaz();
        const hour = now.getHours();
        const schedule = db.getSchedule();
        setIsClinicOpen(hour >= schedule.startHour && hour < schedule.endHour);
        setCurrentTime(now);
        
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 18) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    };

    checkStatus();
    loadData();

    // Clock Interval
    const timer = setInterval(checkStatus, 1000);

    // Click outside handler for search
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        clearInterval(timer);
    };
  }, []);

  // Search Logic
  useEffect(() => {
    if (searchQuery.length > 0) {
        const results = db.searchPatients(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
    } else {
        setSearchResults([]);
        setShowSearchResults(false);
    }
  }, [searchQuery]);

  const handlePatientSelect = (patient: Patient) => {
      setSelectedPatientForAttention(patient);
      setSearchQuery('');
      setShowSearchResults(false);
  };

  // Appointment Attention Handler
  const handleAttendAppointment = (app: Appointment) => {
      // Find patient
      const patient = db.getPatients().find(p => p.id === app.patientId);
      if (patient) {
          // Extract probable procedure from notes or type
          let proc = app.type === 'Tratamiento' ? 'Consulta General' : app.type;
          if (app.notes && app.notes.includes('-')) {
             proc = app.notes.split('-')[0].trim();
          } else if (app.notes) {
             proc = app.notes; 
          }
          
          setAppointmentToAttend({
              patient,
              id: app.id,
              procedure: proc
          });
      }
  };

  // Diagnosis Navigation
  const handleStartDiagnosis = (patient: Patient) => {
      onNavigate('diagnosis', patient);
  };

  // --- Handlers ---
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newReminder.trim()) return;
    db.addReminder(newReminder, user);
    // Refresh local state with sort
    const sorted = [...db.getReminders()].sort((a, b) => Number(a.completed) - Number(b.completed));
    setReminders(sorted);
    setNewReminder('');
    setShowAddReminder(false);
  };

  const handleToggleReminder = (id: string) => {
    db.toggleReminder(id);
    const sorted = [...db.getReminders()].sort((a, b) => Number(a.completed) - Number(b.completed));
    setReminders(sorted);
  };

  const handleDeleteReminder = (id: string) => {
    db.deleteReminder(id);
    const sorted = [...db.getReminders()].sort((a, b) => Number(a.completed) - Number(b.completed));
    setReminders(sorted);
  };

  const initiateCancel = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setCancelId(id);
  };

  const confirmCancel = () => {
      if (!cancelId) return;
      
      // 1. Strike through (Add to animating list)
      setAnimatingIds(prev => [...prev, cancelId]);
      
      // 2. Wait for animation, then remove
      setTimeout(() => {
          db.cancelAppointment(cancelId);
          setAnimatingIds(prev => prev.filter(id => id !== cancelId));
          setCancelId(null);
          loadData();
      }, 700); // 700ms match transition time
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-BO', { style: 'decimal', minimumFractionDigits: 0 }).format(value);
  };

  // Helper for Date/Time Formatting (La Paz)
  const formatTimeLaPaz = (date: Date) => {
    return new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // 24H Format
    }).format(date);
  };

  const formatDateLaPaz = (date: Date) => {
    return new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(date);
  };

  // Filter future appointments: Start of today
  const startOfToday = db.getNowLaPaz();
  startOfToday.setHours(0,0,0,0);
  const now = db.getNowLaPaz();
  
  const upcomingAppointments = appointments
    .filter(a => new Date(a.date) >= startOfToday && a.status === 'Pendiente')
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // --- KPI LOGIC BASED ON ROLE ---
  const renderRoleBasedKPI = () => {
      if (user.role === UserRole.PRINCIPAL) {
          return (
            <div className="flex-1 min-w-[120px] px-2 flex flex-col items-center animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ingresos del Mes</span>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span className="text-xl font-bold tracking-tight">Bs.- {formatCurrency(stats.monthlyIncome)}</span>
                </div>
            </div>
          );
      } else if (user.role === UserRole.STAFF) {
          return (
            <div className="flex-1 min-w-[120px] px-2 flex flex-col items-center animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Caja Diaria (Hoy)</span>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span className="text-xl font-bold tracking-tight">Bs.- {formatCurrency(stats.dailyIncome)}</span>
                </div>
            </div>
          );
      } else { // DOCTOR
          // For doctor, show total patients attended (using total patients for now as mock, or filtered if possible)
          return (
            <div className="flex-1 min-w-[120px] px-2 flex flex-col items-center animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pacientes Atendidos</span>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Users size={16} strokeWidth={3} />
                    <span className="text-xl font-bold tracking-tight">{recentTreated.length}</span>
                </div>
            </div>
          );
      }
  };

  // Helper to detect if search query is numeric (for CI)
  const isNumericQuery = /^\d+$/.test(searchQuery.trim());

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. UNIFIED HEADER HERO SECTION */}
      <div className="relative rounded-3xl shadow-xl overflow-hidden p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6 text-white transition-all transform hover:scale-[1.01] duration-500">
         {/* Dynamic Background */}
         <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
         
         {/* Modern Gradient Overlay */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none animate-pulse"></div>
         <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
         
         {/* Content Left */}
         <div className="relative z-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-400">{user.name}</span>
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-sm transition-transform hover:scale-105">
                {isClinicOpen ? (
                    <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                        <Unlock size={12} className="text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Consultorio Abierto</span>
                    </>
                ) : (
                    <>
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></span>
                        <Lock size={12} className="text-red-400" />
                        <span className="text-xs font-bold text-red-100 uppercase tracking-widest">Consultorio Cerrado</span>
                    </>
                )}
            </div>
         </div>

         {/* Content Right (Time) */}
         <div className="relative z-10 flex flex-col items-center md:items-end border-t md:border-t-0 border-white/10 pt-6 md:pt-0 w-full md:w-auto">
            <div className="text-6xl font-bold tracking-tighter tabular-nums drop-shadow-lg leading-none">
                {formatTimeLaPaz(currentTime)}
            </div>
            <div className="text-sm font-medium text-slate-300 uppercase tracking-wide mt-2 flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                {formatDateLaPaz(currentTime)}
            </div>
         </div>
      </div>

      {/* MINIMALIST KPI SUMMARY BAR */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm px-6 py-4 flex flex-wrap justify-around items-center gap-4 text-center divide-x divide-slate-100 dark:divide-slate-700">
          
          {/* Dynamic KPI based on Role */}
          {renderRoleBasedKPI()}

          <div className="flex-1 min-w-[120px] px-2 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Pacientes</span>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Users size={16} strokeWidth={3} />
                  <span className="text-xl font-bold tracking-tight">{stats.totalPatients}</span>
              </div>
          </div>

          <div className="flex-1 min-w-[120px] px-2 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Citas Hoy</span>
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <Calendar size={16} strokeWidth={3} />
                  <span className="text-xl font-bold tracking-tight">{stats.appointmentsToday}</span>
              </div>
          </div>
      </div>

      {/* 2. OPERATIONAL CENTER (Search + Distinctive Action Cards) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
          
          {/* A. SEARCH BAR (Main Action Trigger) - SPAN 2 */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between min-h-[140px]" ref={searchRef}>
             {/* Header */}
             <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Zap size={20} className="text-primary" />
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Nueva Consulta / Nuevo paciente
                    </label>
                </div>
                <button 
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    <HelpCircle size={14} />
                    <span>¿Cómo funciona?</span>
                </button>
             </div>

             {/* The Search Input - Centered Vertically in remaining space */}
             <div className="relative group flex-1 flex items-center">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={24} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Busque paciente por nombre o CI para atender..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xl font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                />
                
                {/* Search Dropdown Results */}
                {showSearchResults && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-slide-down z-50">
                        {searchResults.length > 0 ? (
                            <>
                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Resultados de Búsqueda
                                </div>
                                {searchResults.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => handlePatientSelect(p)}
                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center justify-between group transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-indigo-900/30 flex items-center justify-center text-slate-600 dark:text-indigo-300 font-bold text-sm group-hover:bg-white group-hover:text-primary transition-colors">
                                                {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors text-base">{p.firstName} {p.lastName}</p>
                                                <p className="text-xs text-slate-500">CI: {p.dni}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                            Atender <ChevronRight size={16} />
                                        </div>
                                    </button>
                                ))}
                            </>
                        ) : (
                            <div className="p-4 text-center">
                                <p className="text-sm text-slate-500 mb-3">No existe el paciente.</p>
                                <button 
                                    onClick={() => { setShowNewPatientForm(true); setShowSearchResults(false); }}
                                    className="w-full py-3 bg-slate-900 dark:bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserPlus size={18} />
                                    {isNumericQuery 
                                        ? `Registrar con CI: ${searchQuery}`
                                        : `Registrar a: "${searchQuery}"`
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                )}
             </div>
          </div>

          {/* B. SECONDARY ACTIONS (DISTINCTIVE CARDS) - SPAN 1 (Grid inside) */}
          <div className="xl:col-span-1 grid grid-cols-2 gap-4 h-full min-h-[140px]">
              
              {/* Agenda / New Appointment Card */}
              <button 
                onClick={() => setShowNewAppointmentModal(true)}
                className="relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between h-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                  <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-2 -translate-y-2">
                      <CalendarPlus size={50} />
                  </div>
                  <div className="relative z-10 bg-white/20 w-fit p-2 rounded-lg backdrop-blur-sm">
                      <CalendarPlus size={20} />
                  </div>
                  <div className="relative z-10 mt-auto pt-4">
                      <h3 className="font-bold text-base leading-tight">Agendar Cita</h3>
                      <p className="text-[10px] text-indigo-100 opacity-90 mt-0.5">Nueva Consulta / Trat.</p>
                  </div>
              </button>

              {/* Ingreso Card */}
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between h-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                  <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-2 -translate-y-2">
                      <BadgeDollarSign size={50} />
                  </div>
                  <div className="relative z-10 bg-white/20 w-fit p-2 rounded-lg backdrop-blur-sm">
                      <BadgeDollarSign size={20} />
                  </div>
                  <div className="relative z-10 mt-auto pt-4">
                      <h3 className="font-bold text-base leading-tight">Registrar Ingreso</h3>
                      <p className="text-[10px] text-emerald-100 opacity-90 mt-0.5">Cobro Rápido</p>
                  </div>
              </button>

          </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Dual Widget: Appointments & Recent Patients) */}
        <div className="lg:col-span-2">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-full min-h-[400px]">
              
              {/* Tab Header */}
              <div className="flex border-b border-slate-100 dark:border-slate-700">
                 <button 
                    onClick={() => setActiveWidgetTab('appointments')}
                    className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                       activeWidgetTab === 'appointments' 
                       ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-b-2 border-primary' 
                       : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                 >
                    <Calendar size={18} /> Próximas Citas
                 </button>
                 <button 
                    onClick={() => setActiveWidgetTab('recent')}
                    className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                       activeWidgetTab === 'recent' 
                       ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-b-2 border-primary' 
                       : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                 >
                    <History size={18} /> Pacientes Recientes
                 </button>
              </div>

              {/* Widget Content */}
              <div className="p-0 flex-1 overflow-y-auto max-h-[400px]">
                 {activeWidgetTab === 'appointments' ? (
                     <div>
                        {upcomingAppointments.length > 0 ? (
                           <div className="divide-y divide-slate-100 dark:divide-slate-700">
                              {upcomingAppointments.map(app => {
                                 const isAnimating = animatingIds.includes(app.id);
                                 const appDate = new Date(app.date);
                                 const isToday = appDate.toDateString() === now.toDateString();

                                 return (
                                 <div 
                                    key={app.id} 
                                    onClick={() => handleAttendAppointment(app)}
                                    className={`relative p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 group cursor-pointer overflow-hidden ${
                                        isAnimating ? 'opacity-0 translate-x-10 grayscale line-through' : 'opacity-100 hover:shadow-[inset_4px_0_0_0_rgba(13,148,136,1)]'
                                    }`}
                                 >
                                    {/* Date Icon - Changes Color if Today */}
                                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-colors ${
                                        isToday 
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50'
                                    }`}>
                                       <span className="text-xs font-bold uppercase">{appDate.toLocaleDateString('es-ES', {month: 'short'})}</span>
                                       <span className="text-xl font-bold">{appDate.getDate()}</span>
                                    </div>
                                    
                                    {/* Info - Remains visible always */}
                                    <div className="flex-1 min-w-0">
                                       <h4 className="font-semibold text-slate-800 dark:text-white group-hover:text-primary transition-colors truncate">{app.patientName}</h4>
                                       <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                          <Clock size={12} />
                                          <span className={isToday ? 'font-bold text-emerald-600' : ''}>{db.formatTime(app.date)}</span>
                                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                          <span className="truncate">{app.notes ? app.notes.split('-')[0].trim() : app.type}</span>
                                       </div>
                                    </div>
                                    
                                    {/* Interactive Right Side Area */}
                                    <div className="flex items-center gap-2 pl-2">
                                        
                                        {/* "Attend" Call to Action - Slides in on hover, doesn't block text */}
                                        <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                            <span>Atender</span>
                                            <ChevronRight size={14} />
                                        </div>

                                        <button
                                            onClick={(e) => initiateCancel(e, app.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors z-10"
                                            title="Cancelar Cita"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                 </div>
                              )})}
                           </div>
                        ) : (
                           <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                              <Calendar size={40} className="mb-2 opacity-20" />
                              <p>No hay citas próximas programadas.</p>
                              <button onClick={() => onNavigate('appointments')} className="text-primary text-sm font-medium mt-2 hover:underline">Ver Agenda Completa</button>
                           </div>
                        )}
                     </div>
                 ) : (
                     <div>
                        {recentTreated.length > 0 ? (
                           <div className="divide-y divide-slate-100 dark:divide-slate-700">
                              {recentTreated.map(item => (
                                 <div 
                                    key={item.patient.id} 
                                    onClick={() => handleStartDiagnosis(item.patient)}
                                    className="p-4 flex items-center gap-4 hover:bg-indigo-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer group relative overflow-hidden"
                                 >
                                    {/* Subtle hover background accent */}
                                    <div className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/10 transition-colors pointer-events-none"></div>

                                    <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-sm relative z-10">
                                       {item.patient.firstName.charAt(0)}{item.patient.lastName.charAt(0)}
                                    </div>
                                    <div className="flex-1 relative z-10">
                                       <h4 className="font-semibold text-slate-800 dark:text-white group-hover:text-primary transition-colors">{item.patient.firstName} {item.patient.lastName}</h4>
                                       <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                          <Stethoscope size={12} />
                                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.lastTreatment.procedure}</span>
                                          <span className="text-slate-300">|</span>
                                          <span className="italic">{new Date(item.lastTreatment.date).toLocaleDateString()}</span>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2 relative z-10">
                                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                          item.lastTreatment.status === 'Completado' 
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                       }`}>
                                          {item.lastTreatment.status}
                                       </span>
                                       <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                           <ChevronRight size={18} />
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                              <Activity size={40} className="mb-2 opacity-20" />
                              <p>No hay actividad reciente registrada.</p>
                           </div>
                        )}
                     </div>
                 )}
              </div>
           </div>
        </div>

        {/* Right Column (Expanded Reminders Only) */}
        <div className="space-y-6">
            
            {/* REMINDERS WIDGET - Taking full height of column */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full min-h-[400px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold">
                    <Bell size={20} />
                    <span>Recordatorios & Notas</span>
                </div>
                <button 
                  onClick={() => setShowAddReminder(!showAddReminder)}
                  className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3">
                  {showAddReminder && (
                    <form onSubmit={handleAddReminder} className="mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 animate-fade-in">
                      <input 
                        autoFocus
                        type="text" 
                        value={newReminder}
                        onChange={(e) => setNewReminder(e.target.value)}
                        placeholder="Escriba nueva tarea..."
                        className="w-full text-sm border-b border-amber-300 dark:border-amber-600 outline-none bg-transparent text-slate-900 dark:text-white pb-1 placeholder:text-slate-400"
                      />
                      <div className="flex justify-end mt-2">
                        <button type="submit" className="text-xs bg-amber-500 text-white px-3 py-1 rounded shadow-sm hover:bg-amber-600">Añadir</button>
                      </div>
                    </form>
                  )}
                  {reminders.length === 0 && !showAddReminder ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <CheckCircle2 size={40} className="mb-2 opacity-20" />
                        <p className="text-xs italic">Todo está al día</p>
                    </div>
                  ) : (
                    reminders.map(r => (
                      <div key={r.id} className="flex flex-col gap-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 group hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                        <div className="flex items-start gap-3">
                            <button onClick={() => handleToggleReminder(r.id)} className="mt-0.5 text-slate-400 hover:text-primary transition-colors">
                              {r.completed ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} />}
                            </button>
                            <span className={`text-sm flex-1 text-slate-700 dark:text-slate-200 leading-snug ${r.completed ? 'line-through opacity-50' : ''}`}>
                              {r.text}
                            </span>
                            <button onClick={() => handleDeleteReminder(r.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                        </div>
                        {/* Creator Tag */}
                        <div className="pl-7">
                             <span className="text-[10px] font-medium bg-white dark:bg-slate-600 text-slate-400 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-500 flex w-fit shadow-sm">
                                Por: {r.createdBy || 'Sistema'}
                             </span>
                        </div>
                      </div>
                    ))
                  )}
              </div>
            </div>

        </div>

      </div>

      {/* MODALS */}
      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} onSuccess={loadData} />}
      
      {/* INTEGRAL ATTENTION MODAL (Manual Trigger) */}
      {selectedPatientForAttention && (
          <IntegralAttentionModal 
            patient={selectedPatientForAttention}
            onClose={() => setSelectedPatientForAttention(null)}
            onSuccess={() => {
                loadData();
                setSearchQuery('');
            }}
          />
      )}

      {/* INTEGRAL ATTENTION MODAL (From Appointment) */}
      {appointmentToAttend && (
          <IntegralAttentionModal 
            patient={appointmentToAttend.patient}
            appointmentId={appointmentToAttend.id}
            initialProcedure={appointmentToAttend.procedure}
            onClose={() => setAppointmentToAttend(null)}
            onSuccess={() => {
                loadData();
                setAppointmentToAttend(null);
            }}
          />
      )}

      {/* NEW APPOINTMENT MODAL (Reusing TreatmentModal) */}
      {showNewAppointmentModal && (
          <TreatmentModal 
             onClose={() => setShowNewAppointmentModal(false)}
             onSuccess={() => {
                 loadData();
                 setShowNewAppointmentModal(false);
             }}
          />
      )}

      {/* QUICK NEW PATIENT FORM (INLINE) */}
      {showNewPatientForm && (
          <PatientForm 
            initialName={!isNumericQuery ? searchQuery : ''}
            initialCi={isNumericQuery ? searchQuery : ''}
            onCancel={() => setShowNewPatientForm(false)}
            onSuccess={() => {
                // After creating, immediately refresh.
                // If user entered ID, we could search by ID, if name, by name.
                setTimeout(() => {
                    loadData();
                    setShowNewPatientForm(false);
                }, 100);
            }}
          />
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                 <XCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Cancelar Cita?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                La cita se eliminará de la lista de pendientes.
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setCancelId(null)}
                   className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                 >
                   Mantener
                 </button>
                 <button 
                   onClick={confirmCancel}
                   className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:shadow-lg hover:bg-red-700"
                 >
                   Sí, Cancelar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-indigo-600 p-6 flex justify-between items-start">
                  <div className="text-white">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                         <Info size={20} />
                         Guía de Flujo Clínico Rápido
                      </h3>
                      <p className="text-indigo-100 text-xs mt-1">Cómo optimizar la atención del paciente</p>
                  </div>
                  <button onClick={() => setShowHelpModal(false)} className="text-white/70 hover:text-white bg-white/10 p-1 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-6">
                  
                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">1</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Búsqueda Inteligente</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Escriba el <strong>Nombre, Apellido o Carnet (CI)</strong> en la barra central grande.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">2</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Atención Inmediata</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Si el paciente aparece en la lista desplegable, haga clic en su nombre para ir directo al diagnóstico o cobro.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">3</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Registro Rápido</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Si no encuentra resultados, aparecerá un botón azul para <strong>"Registrar"</strong> al instante usando el nombre o número que ya escribió.
                          </p>
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowHelpModal(false)}
                    className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                      Entendido, Volver al Tablero
                  </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
