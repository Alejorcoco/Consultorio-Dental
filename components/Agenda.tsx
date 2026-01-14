
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Appointment, Patient } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, Plus, LayoutList, CalendarDays, Grid, XCircle, CheckCircle2, Flag, HelpCircle, Info, X } from 'lucide-react';
import IntegralAttentionModal from './IntegralAttentionModal';
import TreatmentModal from './TreatmentModal';

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const Agenda: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(db.getNowLaPaz());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [holidays, setHolidays] = useState<{date: string, name: string}[]>([]);
  const [hours, setHours] = useState<number[]>([]);
  
  // Modals & Actions
  const [patientForAttention, setPatientForAttention] = useState<Patient | null>(null);
  const [appointmentToAttend, setAppointmentToAttend] = useState<{id: string, procedure: string} | undefined>(undefined);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Cancel State
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Pre-fill modal data when clicking calendar slot
  const [slotDate, setSlotDate] = useState<Date | undefined>(undefined);
  const [slotTime, setSlotTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    refreshData();
    setHolidays(db.getBolivianHolidays(currentDate.getFullYear()));
    const s = db.getSchedule();
    setHours(Array.from({ length: s.endHour - s.startHour + 1 }, (_, i) => i + s.startHour));
  }, [currentDate]);

  const refreshData = () => {
      setAppointments(db.getAppointments());
      setPatients(db.getPatients());
  };

  const handleCancelAppointment = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); 
      setCancelId(id);
  };

  const confirmCancel = () => {
      if (cancelId) {
          db.cancelAppointment(cancelId);
          setCancelId(null);
          refreshData();
      }
  };

  const handleSlotClick = (date: Date, hour: number) => {
      const now = db.getNowLaPaz();
      const checkDate = new Date(date);
      checkDate.setHours(hour, 0, 0, 0);

      // Prevent booking in the past
      if (checkDate < now) return;

      setSlotDate(checkDate);
      setSlotTime(`${hour.toString().padStart(2, '0')}:00`);
      setShowNewAppointmentModal(true);
  };

  // --- HELPERS ---

  // Get Monday of the current week for 'Week' view
  const getMonday = (d: Date) => {
    d = new Date(d);
    const day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getWeekStart = () => getMonday(currentDate);

  const getAppointmentsForCell = (dayDate: Date, hour: number) => {
    return appointments.filter(a => {
      const aDate = new Date(a.date);
      return (
        aDate.getDate() === dayDate.getDate() &&
        aDate.getMonth() === dayDate.getMonth() &&
        aDate.getFullYear() === dayDate.getFullYear() &&
        aDate.getHours() === hour
      );
    });
  };
  
  const getAppointmentsForDay = (dayDate: Date) => {
    return appointments.filter(a => {
      const aDate = new Date(a.date);
      return (
        aDate.getDate() === dayDate.getDate() &&
        aDate.getMonth() === dayDate.getMonth() &&
        aDate.getFullYear() === dayDate.getFullYear()
      );
    });
  };

  const handleAppointmentClick = (appt: Appointment) => {
    if (appt.status === 'Cancelada') return; 
    if (appt.status === 'Completada') return; 

    const p = patients.find(pat => pat.id === appt.patientId);
    if (p) {
        setPatientForAttention(p);
        
        let proc = appt.type === 'Tratamiento' ? 'Consulta General' : appt.type;
        if (appt.notes && appt.notes.includes('-')) {
            proc = appt.notes.split('-')[0].trim();
        } else if (appt.notes) {
            proc = appt.notes;
        }

        setAppointmentToAttend({ id: appt.id, procedure: proc });
    }
  };

  const getPatientDebt = (patientId: string) => {
      return db.getPatientBalance(patientId).debt;
  };

  const getHolidayName = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const found = holidays.find(h => h.date === dateStr);
      return found ? found.name : null;
  };

  // --- LISTS LOGIC ---
  const today = db.getNowLaPaz();
  const todaysAppointments = appointments.filter(a => {
      const aDate = new Date(a.date);
      return aDate.toDateString() === today.toDateString() && a.status !== 'Cancelada';
  }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingAppointments = appointments.filter(a => {
      const aDate = new Date(a.date);
      return aDate > today && aDate.toDateString() !== today.toDateString() && a.status === 'Pendiente';
  }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5); // Next 5

  // --- RENDERERS ---

  const renderHeader = () => {
      let label = '';
      if (viewMode === 'day') {
          label = currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      } else if (viewMode === 'week') {
          const start = getWeekStart();
          const end = new Date(start);
          end.setDate(end.getDate() + 5);
          label = `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
      } else {
          label = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }

      return (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary transition-all"><ChevronLeft size={20} /></button>
            <span className="text-base font-bold w-48 text-center text-slate-800 dark:text-white capitalize">
                {label}
            </span>
            <button onClick={() => navigateDate('next')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary transition-all"><ChevronRight size={20} /></button>
        </div>
      );
  };

  const renderWeekView = () => (
    <div className="min-w-[800px] h-full flex flex-col">
        {/* Header Row (Days) */}
        <div className="grid grid-cols-[60px_repeat(6,1fr)] bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
            <div className="p-3 border-r border-slate-200 dark:border-slate-700"></div>
            {DAYS.map((day, i) => {
                const start = getWeekStart();
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                const isToday = d.toDateString() === db.getNowLaPaz().toDateString();
                const holiday = getHolidayName(d);

                return (
                    <div key={day} className={`p-3 text-center border-r border-slate-200 dark:border-slate-700 relative overflow-hidden ${isToday ? 'bg-primary/5' : ''}`}>
                        <div className="text-xs font-bold text-slate-400 uppercase">{day}</div>
                        <div className={`text-lg font-bold ${isToday ? 'text-primary' : holiday ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {d.getDate()}
                        </div>
                        {holiday && (
                            <div className="text-[9px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/30 rounded px-1 py-0.5 mt-1 inline-block truncate max-w-full">
                                {holiday}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        {/* Time Slots */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {hours.map(hour => (
                <div key={hour} className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-slate-100 dark:border-slate-700/50">
                    <div className="p-2 text-right text-xs text-slate-400 font-medium border-r border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                        {hour}:00
                    </div>
                    {DAYS.map((_, dayIndex) => {
                        const start = getWeekStart();
                        const d = new Date(start);
                        d.setDate(d.getDate() + dayIndex);
                        const cellAppts = getAppointmentsForCell(d, hour);
                        return renderCell(cellAppts, hour, d);
                    })}
                </div>
            ))}
        </div>
    </div>
  );

  const renderDayView = () => (
      <div className="w-full h-full flex flex-col">
         <div className="grid grid-cols-[80px_1fr] bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
             <div className="p-4 border-r border-slate-200 dark:border-slate-700"></div>
             <div className="p-4 text-center border-r border-slate-200 dark:border-slate-700">
                 <span className="font-bold text-primary text-xl">{DAYS_FULL[currentDate.getDay()]} {currentDate.getDate()}</span>
                 {getHolidayName(currentDate) && (
                     <span className="ml-2 bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded-full font-bold">{getHolidayName(currentDate)}</span>
                 )}
             </div>
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar">
             {hours.map(hour => {
                 const cellAppts = getAppointmentsForCell(currentDate, hour);
                 return (
                    <div key={hour} className="grid grid-cols-[80px_1fr] border-b border-slate-100 dark:border-slate-700/50 min-h-[100px]">
                        <div className="p-4 text-right text-sm text-slate-400 font-bold border-r border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                            {hour}:00
                        </div>
                        <div 
                            className="p-2 relative group hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                            onClick={() => handleSlotClick(currentDate, hour)}
                        >
                            {cellAppts.map(appt => renderAppointmentCard(appt))}
                            {cellAppts.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none">
                                    <Plus size={24} className="text-slate-400" />
                                </div>
                            )}
                        </div>
                    </div>
                 );
             })}
         </div>
      </div>
  );

  const renderMonthView = () => {
      // Logic to render grid of days
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Adjust for Monday start
      
      const gridCells = [];
      // Empty cells
      for(let i=0; i<startDayIndex; i++) gridCells.push(<div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 dark:bg-slate-900/20 border-r border-b border-slate-200 dark:border-slate-700"></div>);
      // Days
      for(let d=1; d<=daysInMonth; d++) {
          const date = new Date(year, month, d);
          const dayAppts = getAppointmentsForDay(date);
          const isToday = date.toDateString() === db.getNowLaPaz().toDateString();
          const holiday = getHolidayName(date);
          
          gridCells.push(
              <div key={d} className={`min-h-[100px] border-r border-b border-slate-200 dark:border-slate-700 p-2 relative group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                      <div className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{d}</div>
                      {holiday && <div className="text-[9px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded flex items-center gap-1"><Flag size={8}/> {holiday}</div>}
                  </div>
                  <div className="space-y-1">
                      {dayAppts.slice(0, 3).map(a => (
                          <div key={a.id} onClick={(e) => { e.stopPropagation(); handleAppointmentClick(a); }} className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${a.status === 'Cancelada' ? 'bg-slate-100 text-slate-400 line-through' : a.status === 'Completada' ? 'bg-slate-200 text-slate-500 line-through decoration-slate-400' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}>
                              {new Date(a.date).getHours()}:00 {a.patientName}
                          </div>
                      ))}
                      {dayAppts.length > 3 && <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayAppts.length - 3} más</div>}
                  </div>
              </div>
          );
      }

      return (
          <div className="w-full h-full flex flex-col">
              <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  {DAYS_FULL.map(d => <div key={d} className="p-3 text-center text-xs font-bold text-slate-400 uppercase">{d.substring(0,3)}</div>)}
              </div>
              <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-slate-700 flex-1 overflow-y-auto custom-scrollbar">
                  {gridCells}
              </div>
          </div>
      );
  };

  const renderCell = (cellAppts: Appointment[], hour: number, date: Date) => {
    // Show active first, then completed, then cancelled
    const active = cellAppts.filter(a => a.status === 'Pendiente');
    const completed = cellAppts.filter(a => a.status === 'Completada');
    const cancelled = cellAppts.filter(a => a.status === 'Cancelada');
    
    const apptsToShow = [...active, ...completed, ...cancelled];

    return (
        <div 
            key={`${date.toISOString()}-${hour}`} 
            className="relative min-h-[80px] border-r border-slate-100 dark:border-slate-700 p-1 group hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            onClick={() => handleSlotClick(date, hour)}
        >
            {apptsToShow.map(appt => renderAppointmentCard(appt))}
            {apptsToShow.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none">
                    <Plus size={20} className="text-slate-300" />
                </div>
            )}
        </div>
    );
  };

  const renderAppointmentCard = (appt: Appointment) => {
    const debt = getPatientDebt(appt.patientId);
    const isCancelled = appt.status === 'Cancelada';
    const isCompleted = appt.status === 'Completada';
    
    const displayText = appt.notes ? appt.notes : appt.type;

    return (
        <div 
            key={appt.id}
            onClick={(e) => { e.stopPropagation(); handleAppointmentClick(appt); }}
            className={`w-full text-left p-2 mb-1 rounded-lg border-l-4 text-xs shadow-sm hover:shadow-md transition-all relative overflow-hidden group/card ${
                isCancelled ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-400 opacity-60' :
                isCompleted ? 'bg-slate-50 dark:bg-slate-800 border-slate-400 text-slate-500 opacity-80' :
                appt.type === 'Tratamiento' ? 'bg-indigo-50 border-indigo-500 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 cursor-pointer' :
                'bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200 cursor-pointer'
            }`}
        >
            <div className={`font-bold truncate pr-2 ${isCancelled ? 'line-through' : ''}`}>
                {appt.patientName}
                {isCompleted && <span className="ml-1 inline-block text-[9px] bg-slate-200 text-slate-600 px-1 rounded uppercase align-middle">Atendido</span>}
            </div>
            <div className="flex flex-col opacity-90">
                <span className={`truncate font-medium ${isCancelled ? 'line-through' : ''}`}>{displayText}</span>
                {viewMode === 'day' && <span className="font-mono text-[10px] mt-0.5">{db.formatTime(appt.date)}</span>}
            </div>
            
            {isCompleted && (
                <div className="absolute top-1 right-1 text-slate-400">
                    <CheckCircle2 size={14} />
                </div>
            )}

            {debt > 0 && !isCancelled && !isCompleted && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" title={`Deuda: Bs ${debt}`} />
            )}

            {!isCancelled && !isCompleted && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 bg-white/80 dark:bg-slate-800/80 rounded-full pl-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleAppointmentClick(appt); }}
                        className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full p-0.5"
                        title="Marcar como Atendida"
                    >
                        <CheckCircle2 size={16} />
                    </button>
                    <button 
                        onClick={(e) => handleCancelAppointment(e, appt.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full p-0.5"
                        title="Cancelar Cita"
                    >
                        <XCircle size={16} />
                    </button>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in pb-10">
      
      {/* Header with Title and Button */}
      <div className="flex justify-between items-end">
          <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Agenda Clínica</h1>
              <p className="text-slate-500 dark:text-slate-400">Planificación de citas, recordatorios y días festivos.</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setShowHelpModal(true)}
                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5"
            >
                <HelpCircle size={18} />
                <span className="hidden sm:inline">¿Cómo funciona?</span>
            </button>
            <button 
                onClick={() => { setSlotDate(undefined); setSlotTime(undefined); setShowNewAppointmentModal(true); }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2"
            >
                <Plus size={18} /> Nueva Cita
            </button>
          </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden min-h-[500px]">
          
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
            {renderHeader()}
            
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('day')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                >
                    Día
                </button>
                <button 
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                >
                    Semana
                </button>
                <button 
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                >
                    Mes
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
             {viewMode === 'day' && renderDayView()}
             {viewMode === 'week' && renderWeekView()}
             {viewMode === 'month' && renderMonthView()}
          </div>
      </div>

      {/* Bottom Area: Today's Appointments & Upcoming */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4">
          
          {/* Today's Section */}
          <div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <CalendarDays size={16} className="text-primary" />
                  Citas de Hoy ({todaysAppointments.length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {todaysAppointments.length > 0 ? todaysAppointments.map(app => {
                      const isCompleted = app.status === 'Completada';
                      return (
                      <div 
                          key={app.id} 
                          onClick={() => handleAppointmentClick(app)} 
                          className={`min-w-[200px] p-3 rounded-xl border shadow-sm transition-all group flex flex-col justify-between ${
                              isCompleted 
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70'
                              : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-primary cursor-pointer'
                          }`}
                      >
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                  <span className={`font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{app.patientName}</span>
                                  <span className="text-xs font-bold bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                      {db.formatTime(app.date)}
                                  </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span className={`w-2 h-2 rounded-full ${app.type === 'Tratamiento' ? 'bg-indigo-500' : 'bg-teal-500'}`}></span>
                                  <span className="truncate">{app.notes ? app.notes.split('-')[0] : app.type}</span>
                              </div>
                          </div>
                          {!isCompleted && (
                            <div className="mt-2 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-wider text-right">
                                Atender →
                            </div>
                          )}
                      </div>
                  )}) : (
                      <div className="flex items-center gap-3 text-slate-400 text-sm italic p-2 border border-dashed border-slate-200 rounded-lg w-full">
                          <Clock size={20} /> No hay citas pendientes para hoy.
                      </div>
                  )}
              </div>
          </div>

          {/* Upcoming Section */}
          {upcomingAppointments.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 text-xs uppercase tracking-wide">
                      Próximas Citas
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                      {upcomingAppointments.map(app => (
                          <div 
                              key={app.id} 
                              onClick={() => handleAppointmentClick(app)} 
                              className="min-w-[180px] p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                          >
                              <div className="text-xs font-bold text-slate-400 mb-1">{new Date(app.date).toLocaleDateString()} - {db.formatTime(app.date)}</div>
                              <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{app.patientName}</div>
                              <div className="text-xs text-slate-500 truncate">{app.type}</div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>

      {/* Integral Attention Modal */}
      {patientForAttention && (
          <IntegralAttentionModal 
            patient={patientForAttention}
            appointmentId={appointmentToAttend?.id}
            initialProcedure={appointmentToAttend?.procedure}
            onClose={() => {
                setPatientForAttention(null);
                setAppointmentToAttend(undefined);
            }}
            onSuccess={() => {
                refreshData();
                setPatientForAttention(null);
                setAppointmentToAttend(undefined);
            }}
          />
      )}

      {/* New Appointment Modal */}
      {showNewAppointmentModal && (
          <TreatmentModal 
             onClose={() => setShowNewAppointmentModal(false)}
             onSuccess={() => {
                 refreshData();
                 setShowNewAppointmentModal(false);
             }}
             initialDate={slotDate}
             initialTime={slotTime}
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
                La cita se eliminará de la agenda (quedará tachada).
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={() => setCancelId(null)}
                   className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                 >
                   Volver
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
                         Guía de Agenda
                      </h3>
                      <p className="text-indigo-100 text-xs mt-1">Cómo gestionar su tiempo eficientemente</p>
                  </div>
                  <button onClick={() => setShowHelpModal(false)} className="text-white/70 hover:text-white bg-white/10 p-1 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-6">
                  
                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">1</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Crear Cita</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Haga clic en cualquier <strong>espacio vacío</strong> del calendario o use el botón azul "Nueva Cita".
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">2</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Gestionar</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Al pasar el mouse sobre una cita, verá dos botones pequeños: un <strong className="text-emerald-500">Check (✓)</strong> para Atender y una <strong className="text-red-500">X</strong> para Cancelar.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">3</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Vistas</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Use los botones <strong>Día, Semana o Mes</strong> en la parte superior para cambiar cómo ve el calendario.
                          </p>
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowHelpModal(false)}
                    className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                      Entendido, cerrar ayuda
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
