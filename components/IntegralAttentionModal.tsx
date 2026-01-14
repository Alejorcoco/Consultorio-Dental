
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Patient, PaymentMethod, ProcedureItem } from '../types';
import { 
  X, Stethoscope, Save, Wallet, CheckCircle2, DollarSign
} from 'lucide-react';

interface IntegralAttentionModalProps {
  patient: Patient;
  onClose: () => void;
  onSuccess: () => void;
  appointmentId?: string; // Optional: Link to an existing appointment
  initialProcedure?: string; // Optional: Pre-fill procedure from appointment
  initialCost?: number; // Optional: Pre-fill agreed cost
}

const IntegralAttentionModal: React.FC<IntegralAttentionModalProps> = ({ patient, onClose, onSuccess, appointmentId, initialProcedure, initialCost }) => {
  // --- STATE ---
  const [availableProcedures, setAvailableProcedures] = useState<ProcedureItem[]>([]);

  // Clinical Data
  const [procedure, setProcedure] = useState(initialProcedure || '');
  const [description, setDescription] = useState('');
  
  // Financial Data
  const [totalCost, setTotalCost] = useState<number>(initialCost !== undefined ? initialCost : 0);
  
  // Instant Payment Feature (Toggle like in Appointment Modal)
  const [enableInstantPayment, setEnableInstantPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  
  // Previous Logic
  const [isPrePaid, setIsPrePaid] = useState(false);

  // Logic Helpers
  const currentDebt = db.getPatientBalance(patient.id).debt;
  
  // Effects
  useEffect(() => {
      setAvailableProcedures(db.getProcedures());
      
      // Check if appointment was strictly fully prepaid
      if (appointmentId) {
          const appt = db.getAppointments().find(a => a.id === appointmentId);
          if (appt && appt.isPaid) {
              setIsPrePaid(true);
              setPaymentAmount('0'); 
          }
      }
  }, [appointmentId]);

  useEffect(() => {
    if (procedure) {
        const isSameProcedure = initialProcedure && procedure.trim().toLowerCase() === initialProcedure.trim().toLowerCase();
        if (isSameProcedure && initialCost !== undefined) {
            setTotalCost(initialCost);
            return;
        }
        const found = availableProcedures.find(p => p.name.toLowerCase() === procedure.toLowerCase());
        if (found) {
            setTotalCost(found.price);
        }
    }
  }, [procedure, availableProcedures, initialProcedure, initialCost]);

  const handleSave = () => {
    if (!procedure) return;

    // 1. Save Integral Visit (Treatment + Optional Payment)
    db.saveIntegralVisit({
        patient,
        treatment: {
            procedure, // Now serves as "Motivo de Consulta"
            description,
            diagnosis: '', // Removed CIE-10 as requested
            cost: totalCost,
            date: new Date().toISOString(),
            status: 'Completado' 
        },
        payment: {
            amount: enableInstantPayment ? (parseFloat(paymentAmount) || 0) : 0,
            method: paymentMethod
        }
    });

    // 2. If this was linked to an existing appointment, mark it as completed
    if (appointmentId) {
        db.completeAppointment(appointmentId);
    }

    onSuccess();
    onClose();
  };

  const inputClass = "w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm";
  const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER: BIG NAME AND BALANCE */}
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-300 shadow-inner">
                  {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
              </div>
              <div>
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                    {patient.firstName} {patient.lastName}
                 </h2>
                 <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                        {patient.dni}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        Saldo Pendiente: 
                        <span className={`font-bold ${currentDebt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            Bs {currentDebt}
                        </span>
                    </span>
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="group p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
               <X size={24} className="text-slate-400 group-hover:text-red-500 transition-colors" />
           </button>
        </div>

        {/* CONTENT: 2 COLUMN LAYOUT (Like TreatmentModal) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                
                {/* LEFT: CLINICAL DATA */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-xs tracking-wider mb-2 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                        <Stethoscope size={16} /> Datos de la Consulta
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Motivo de Consulta / Tratamiento</label>
                            <input 
                                list="procedures-list"
                                value={procedure}
                                onChange={(e) => setProcedure(e.target.value)}
                                className={inputClass}
                                placeholder="Ej. Consulta General, Endodoncia..."
                                autoFocus
                            />
                            <datalist id="procedures-list">
                                {availableProcedures.map(p => <option key={p.id} value={p.name} />)}
                            </datalist>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Notas / Evolución</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className={`${inputClass} h-32 resize-none`}
                                placeholder="Detalles del procedimiento realizado..."
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT: FINANCIAL DATA */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider mb-2 border-b border-emerald-100 dark:border-emerald-900/50 pb-2">
                        <Wallet size={16} /> Costos y Pagos
                    </div>

                    <div className="space-y-5">
                        {/* Total Cost Display */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <label className={labelClass}>Costo Total del Tratamiento</label>
                            <div className="relative mt-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">Bs</span>
                                <input 
                                    type="number"
                                    value={totalCost}
                                    onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-12 p-3 text-2xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700/50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* PrePaid Notice */}
                        {isPrePaid && (
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={16} />
                                Cita pagada por adelantado.
                            </div>
                        )}

                        {/* Payment Toggle Section */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-sm">
                                    <div className={`p-1.5 rounded-lg ${enableInstantPayment ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <DollarSign size={18} />
                                    </div>
                                    Registrar Pago Inmediato
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setEnableInstantPayment(!enableInstantPayment)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${enableInstantPayment ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enableInstantPayment ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>

                            {enableInstantPayment && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 animate-fade-in space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">Monto a Pagar</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xs">Bs</span>
                                                <input 
                                                    type="number" 
                                                    value={paymentAmount} 
                                                    onChange={e => setPaymentAmount(e.target.value)}
                                                    className="w-full pl-8 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">Método</label>
                                            <select 
                                                value={paymentMethod}
                                                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
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
                                        <span className="text-xs font-bold text-emerald-700/70">Deuda Restante:</span>
                                        <span className="text-sm font-black text-emerald-700">
                                            Bs {Math.max(0, (parseFloat(totalCost.toString()) || 0) - (parseFloat(paymentAmount) || 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-4">
            <button 
                onClick={onClose} 
                className="px-6 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSave}
                disabled={!procedure}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Save size={20} />
                Guardar Atención
            </button>
        </div>

      </div>
    </div>
  );
};

export default IntegralAttentionModal;
