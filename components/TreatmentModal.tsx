
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Patient, PaymentMethod, ProcedureItem } from '../types';
import { 
  X, Search, Save, Calendar as CalendarIcon, 
  Clock, CalendarDays, Wallet, ChevronLeft, ChevronRight
} from 'lucide-react';

interface TreatmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preSelectedPatientId?: string;
  initialDate?: Date;
  initialTime?: string;
  initialProcedure?: string; // New Prop
}

const TreatmentModal: React.FC<TreatmentModalProps> = ({ onClose, onSuccess, preSelectedPatientId, initialDate, initialTime, initialProcedure }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableProcedures, setAvailableProcedures] = useState<ProcedureItem[]>([]);
  
  // Core Data
  const [procedure, setProcedure] = useState(initialProcedure || '');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  
  // Custom Date/Time State
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || db.getNowLaPaz());
  const [viewDate, setViewDate] = useState<Date>(initialDate || db.getNowLaPaz());
  const [selectedTime, setSelectedTime] = useState(initialTime || '09:00');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(18);

  // Advance Payment State
  const [enableAdvancePayment, setEnableAdvancePayment] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>('Efectivo');

  // Confirmation & Error
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setPatients(db.getPatients());
    setAvailableProcedures(db.getProcedures());
    const schedule = db.getSchedule();
    setStartHour(schedule.startHour);
    setEndHour(schedule.endHour);
    
    if (preSelectedPatientId) {
        const found = db.getPatients().find(p => p.id === preSelectedPatientId);
        if (found) setSelectedPatient(found);
    }
  }, [preSelectedPatientId]);

  // Auto-fill cost when procedure is selected
  useEffect(() => {
      const found = availableProcedures.find(p => p.name === procedure);
      if(found) {
          setCost(found.price.toString());
      }
  }, [procedure, availableProcedures]);

  const filteredPatients = patients.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.dni.includes(searchTerm)
  );

  // Helper for numeric inputs
  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
      let val = e.target.value;
      // Prevent negative
      if (val.includes('-')) return;
      // Remove leading zeros but allow "0" and decimals
      if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
          val = val.replace(/^0+/, '');
      }
      setter(val);
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const offset = firstDay === 0 ? 6 : firstDay - 1; 
    return { days, offset };
  };

  const handleMonthChange = (increment: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(newDate.getMonth() + increment);
      setViewDate(newDate);
  };

  const handleQuickDate = (type: 'today' | 'tomorrow' | 'dayAfterTomorrow' | 'nextWeek' | 'nextMonth') => {
      const d = db.getNowLaPaz();
      if (type === 'tomorrow') d.setDate(d.getDate() + 1);
      if (type === 'dayAfterTomorrow') d.setDate(d.getDate() + 2);
      if (type === 'nextWeek') d.setDate(d.getDate() + 7);
      if (type === 'nextMonth') d.setMonth(d.getMonth() + 1);
      // 'today' does nothing to d, it's already today
      
      setSelectedDate(d);
      setViewDate(d); // Sync view
  };

  const generateTimeSlots = () => {
      const slots = [];
      for (let i = startHour; i <= endHour; i++) {
          slots.push(`${i.toString().padStart(2, '0')}:00`);
          if (i !== endHour) slots.push(`${i.toString().padStart(2, '0')}:30`);
      }
      return slots;
  };

  // --- SUBMIT LOGIC ---
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !procedure || !cost) return;
    
    // Validate Past Date
    const checkDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    checkDate.setHours(hours, minutes, 0, 0);
    
    if (checkDate.getTime() < db.getNowLaPaz().getTime() - 60000) {
        setErrorMessage('No se pueden programar citas en el pasado.');
        return;
    }

    setErrorMessage('');
    setIsConfirming(true);
  };

  const confirmAndSubmit = () => {
    if (!selectedPatient) return;
    
    try {
        const finalDate = new Date(selectedDate);
        const [h, m] = selectedTime.split(':').map(Number);
        finalDate.setHours(h, m, 0, 0);
        const isoDate = finalDate.toISOString();

        // 1. Determine Type
        let type: any = 'Consulta';
        const lowerProc = procedure.toLowerCase();
        if (lowerProc.includes('tratamiento') || lowerProc.includes('endodoncia') || lowerProc.includes('cirug')) type = 'Tratamiento';
        else if (lowerProc.includes('revis') || lowerProc.includes('control')) type = 'Revisión';

        const isPaid = enableAdvancePayment && parseFloat(advanceAmount) >= parseFloat(cost);

        // 2. Save Appointment
        db.addAppointment({
            patientId: selectedPatient.id,
            patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
            date: isoDate,
            type: type, 
            status: 'Pendiente',
            notes: `${procedure} ${description ? '- ' + description : ''}`,
            isPaid: isPaid
        });

        // 3. Save Advance Payment (if enabled)
        if (enableAdvancePayment && advanceAmount && parseFloat(advanceAmount) > 0) {
            db.addPayment({
                patientId: selectedPatient.id,
                patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
                amount: parseFloat(advanceAmount),
                date: new Date().toISOString(), // Payment happens NOW
                method: advanceMethod,
                relatedProcedure: procedure, // Linked to the procedure name
                notes: `Adelanto cita: ${procedure}`
            });
        }

        onSuccess();
        onClose();
    } catch (error: any) {
        setErrorMessage(error.message);
        setIsConfirming(false);
    }
  };

  // Styles
  const inputClass = "w-full p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 transition-all shadow-sm";
  const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

  // --- CONFIRMATION VIEW ---
  if (isConfirming && selectedPatient) {
    const total = parseFloat(cost) || 0;
    const advance = enableAdvancePayment ? (parseFloat(advanceAmount) || 0) : 0;
    const balance = total - advance;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
         <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center border border-white/20">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
               <CalendarDays size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Confirmar Cita</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Verifique los detalles antes de agendar.</p>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 mb-6 text-left space-y-3 border border-slate-100 dark:border-slate-600">
                <div className="flex justify-between items-center">
                   <span className="text-xs text-slate-400 uppercase font-bold">Paciente</span>
                   <span className="text-sm font-bold text-slate-800 dark:text-white">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-xs text-slate-400 uppercase font-bold">Fecha y Hora</span>
                   <span className="text-sm font-medium text-slate-800 dark:text-white">
                       {selectedDate.toLocaleDateString('es-BO', {day: '2-digit', month:'short'})} - {selectedTime}
                   </span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-xs text-slate-400 uppercase font-bold">Procedimiento</span>
                   <span className="text-sm font-medium text-slate-800 dark:text-white">{procedure}</span>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-600 my-2"></div>

                <div className="flex justify-between items-center">
                   <span className="text-xs text-slate-500 uppercase font-bold">Costo Estimado</span>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Bs {total}</span>
                </div>
                {enableAdvancePayment && (
                    <>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-emerald-600 uppercase font-bold">Adelanto ({advanceMethod})</span>
                            <span className="text-sm font-bold text-emerald-600">- Bs {advance}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-xs text-indigo-600 uppercase font-bold">Saldo Restante</span>
                            <span className="text-base font-black text-indigo-600">Bs {balance}</span>
                        </div>
                    </>
                )}
            </div>

            <div className="flex gap-3">
               <button 
                 onClick={() => setIsConfirming(false)}
                 className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
               >
                 Volver
               </button>
               <button 
                 onClick={confirmAndSubmit}
                 className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all"
               >
                 Confirmar
               </button>
            </div>
         </div>
      </div>
    );
  }

  // --- CALENDAR RENDER HELPERS ---
  const { days: daysInMonth, offset } = getDaysInMonth(viewDate);
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const monthName = viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const today = db.getNowLaPaz();
  today.setHours(0,0,0,0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                <CalendarIcon size={24} strokeWidth={2.5} />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-none">Agendar Cita</h2>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Programar nueva visita</p>
              </div>
           </div>
           <button onClick={onClose} className="group p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
               <X size={24} className="text-slate-400 group-hover:text-red-500 transition-colors" />
           </button>
        </div>

        {errorMessage && (
            <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3 animate-slide-down">
                <div className="p-1 bg-red-100 dark:bg-red-900/50 rounded-full"><X size={14} /></div>
                {errorMessage}
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                
                {/* LEFT COLUMN: Data & Patient */}
                <div className="space-y-8">
                    
                    {/* Patient Selector */}
                    <div className="space-y-3">
                       <label className={labelClass}>Paciente</label>
                       {selectedPatient ? (
                           <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 group">
                               <div className="flex items-center gap-4 overflow-hidden">
                                   <div className="w-12 h-12 rounded-full bg-white dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg shadow-sm">
                                       {selectedPatient.firstName.charAt(0)}{selectedPatient.lastName.charAt(0)}
                                   </div>
                                   <div className="min-w-0">
                                       <span className="font-bold text-slate-800 dark:text-white text-base block truncate">
                                           {selectedPatient.firstName} {selectedPatient.lastName}
                                       </span>
                                       <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">CI: {selectedPatient.dni}</span>
                                   </div>
                               </div>
                               <button 
                                 type="button" 
                                 onClick={() => setSelectedPatient(null)}
                                 className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 hover:text-red-500 shadow-sm border border-transparent hover:border-red-100 transition-all"
                               >
                                 Cambiar
                               </button>
                           </div>
                       ) : (
                           <div className="relative group">
                               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                   <Search size={20} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                               </div>
                               <input 
                                   type="text"
                                   placeholder="Buscar por nombre o CI..."
                                   value={searchTerm}
                                   onChange={e => setSearchTerm(e.target.value)}
                                   className={inputClass + " pl-12 py-4"}
                                   autoFocus
                               />
                               {searchTerm && (
                                   <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-700 shadow-2xl rounded-2xl border border-slate-100 dark:border-slate-600 max-h-56 overflow-y-auto z-20 mt-2 p-1 custom-scrollbar">
                                       {filteredPatients.map(p => (
                                           <div 
                                             key={p.id}
                                             onClick={() => { setSelectedPatient(p); setSearchTerm(''); }}
                                             className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-600 cursor-pointer rounded-xl flex items-center gap-3 transition-colors"
                                           >
                                               <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-500 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-200">
                                                   {p.firstName.charAt(0)}
                                               </div>
                                               <div>
                                                   <div className="font-bold text-slate-800 dark:text-white text-sm">{p.firstName} {p.lastName}</div>
                                                   <div className="text-[10px] text-slate-400">CI: {p.dni}</div>
                                               </div>
                                           </div>
                                       ))}
                                   </div>
                               )}
                           </div>
                       )}
                    </div>

                    {/* Procedure & Cost */}
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <label className={labelClass}>Procedimiento</label>
                            <input 
                                list="procedures" 
                                value={procedure}
                                onChange={e => setProcedure(e.target.value)}
                                className={inputClass}
                                placeholder="Ej. Consulta General"
                            />
                            <datalist id="procedures">
                                {availableProcedures.map(p => <option key={p.id} value={p.name} />)}
                            </datalist>
                        </div>
                        
                        <div className="space-y-3">
                            <label className={labelClass}>Notas (Opcional)</label>
                            <textarea 
                                rows={2}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className={inputClass + " resize-none"}
                                placeholder="Detalles clínicos breves..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className={labelClass}>Costo Estimado</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-bold text-sm">Bs</span>
                                    </div>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={cost}
                                        onChange={(e) => handleNumericInput(e, setCost)}
                                        className={inputClass + " pl-9 font-bold text-slate-700 dark:text-slate-200"}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advance Payment Module */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
                                <div className={`p-1.5 rounded-lg ${enableAdvancePayment ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Wallet size={18} />
                                </div>
                                Pago por Adelantado
                            </div>
                            <button 
                                type="button"
                                onClick={() => setEnableAdvancePayment(!enableAdvancePayment)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${enableAdvancePayment ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enableAdvancePayment ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        {enableAdvancePayment && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 animate-fade-in space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">Monto Adelanto</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xs">Bs</span>
                                            <input 
                                                type="number" 
                                                value={advanceAmount} 
                                                onChange={(e) => handleNumericInput(e, setAdvanceAmount)}
                                                className="w-full pl-8 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">Método</label>
                                        <select 
                                            value={advanceMethod}
                                            onChange={e => setAdvanceMethod(e.target.value as PaymentMethod)}
                                            className="w-full p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="QR">QR</option>
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="Tarjeta">Tarjeta</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-emerald-200/50">
                                    <span className="text-xs font-bold text-emerald-700/70">Saldo Restante:</span>
                                    <span className="text-sm font-black text-emerald-700">
                                        Bs {(parseFloat(cost) || 0) - (parseFloat(advanceAmount) || 0)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN: Visual Calendar & Time */}
                <div className="space-y-6">
                    <label className={labelClass}>Fecha y Hora de la Cita</label>
                    
                    {/* Visual Calendar */}
                    <div className="bg-white dark:bg-slate-700/30 rounded-3xl border border-slate-200 dark:border-slate-600 p-5 shadow-sm">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
                            <span className="text-sm font-bold text-slate-800 dark:text-white capitalize">{monthName}</span>
                            <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {weekDays.map(d => <div key={d} className="text-[10px] font-bold text-slate-400 mb-2">{d}</div>)}
                            {/* Empty Slots */}
                            {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
                            {/* Days */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                const dateStr = dateObj.toDateString();
                                const isSelected = dateStr === selectedDate.toDateString();
                                const isToday = dateStr === today.toDateString();
                                const isPast = dateObj < today;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => !isPast && setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                                        disabled={isPast}
                                        className={`
                                            h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all
                                            ${isPast ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'}
                                            ${isSelected ? 'bg-indigo-600 text-white shadow-md scale-110 hover:bg-indigo-700' : ''}
                                            ${isToday && !isSelected ? 'border border-indigo-500 text-indigo-600 font-bold' : ''}
                                        `}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-600">
                            <button type="button" onClick={() => handleQuickDate('today')} className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">Hoy</button>
                            <button type="button" onClick={() => handleQuickDate('tomorrow')} className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">Mañana</button>
                            <button type="button" onClick={() => handleQuickDate('dayAfterTomorrow')} className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">Pasado</button>
                            <button type="button" onClick={() => handleQuickDate('nextWeek')} className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">Próx. Semana</button>
                            <button type="button" onClick={() => handleQuickDate('nextMonth')} className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">Próx. Mes</button>
                        </div>
                    </div>

                    {/* Time Selector 24H - MODIFIED FOR MANUAL INPUT */}
                    <div className="bg-white dark:bg-slate-700/30 rounded-3xl border border-slate-200 dark:border-slate-600 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                                <Clock size={14} /> Hora
                            </div>
                            {/* NEW MANUAL INPUT */}
                            <input 
                                type="time"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Selección Rápida</div>
                        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {generateTimeSlots().map(time => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => setSelectedTime(time)}
                                    className={`
                                        py-2 px-1 rounded-lg text-xs font-bold transition-all border
                                        ${selectedTime === time 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                                        }
                                    `}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-4">
             <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors"
             >
                Cancelar
             </button>
             <button 
                type="button"
                onClick={handlePreSubmit}
                disabled={!selectedPatient || !cost || !procedure}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
                <Save size={18} />
                Confirmar Cita
             </button>
        </div>
      </div>
    </div>
  );
};

export default TreatmentModal;
