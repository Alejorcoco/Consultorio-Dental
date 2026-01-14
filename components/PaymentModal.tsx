
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Patient, PaymentMethod, Treatment } from '../types';
import { X, Search, DollarSign, Wallet, CreditCard, QrCode, Stethoscope } from 'lucide-react';

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preSelectedPatientId?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose, onSuccess, preSelectedPatientId }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Available Concepts
  const [pendingTreatments, setPendingTreatments] = useState<Treatment[]>([]);
  
  // Payment Details
  const [conceptType, setConceptType] = useState<'procedure' | 'custom'>('procedure');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [customConcept, setCustomConcept] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Efectivo');
  
  // Confirm State
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const allPatients = db.getPatients();
    setPatients(allPatients);
    
    if (preSelectedPatientId) {
        const found = allPatients.find(p => p.id === preSelectedPatientId);
        if (found) handleSelectPatient(found);
    }
  }, [preSelectedPatientId]);

  const handleSelectPatient = (p: Patient) => {
      setSelectedPatient(p);
      setSearchTerm('');
      
      // Fetch recent treatments for this patient
      const treatments = db.getTreatmentsByPatient(p.id);
      // We will show the last 10 treatments as options
      setPendingTreatments(treatments.slice(0, 10));
  };

  // Auto-fill amount if specific treatment selected
  useEffect(() => {
      if (conceptType === 'procedure' && selectedTreatmentId) {
          const t = pendingTreatments.find(pt => pt.id === selectedTreatmentId);
          if (t) {
              setAmountPaid(t.cost.toString());
          }
      }
  }, [selectedTreatmentId, conceptType, pendingTreatments]);

  const filteredPatients = patients.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.dni.includes(searchTerm)
  );

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !amountPaid) return;
    setIsConfirming(true);
  };

  const confirmAndSubmit = () => {
    if (!selectedPatient) return;
    
    let procedureName = '';
    if (conceptType === 'procedure') {
        const t = pendingTreatments.find(pt => pt.id === selectedTreatmentId);
        procedureName = t ? t.procedure : '';
    }

    db.addPayment({
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        amount: parseFloat(amountPaid),
        date: new Date().toISOString(),
        method,
        relatedProcedure: conceptType === 'procedure' ? procedureName : undefined,
        notes: conceptType === 'custom' ? customConcept : `Pago de: ${procedureName}`
    });

    onSuccess();
    onClose();
  };

  const methods = [
      { id: 'Efectivo', icon: <Wallet size={18} /> },
      { id: 'QR', icon: <QrCode size={18} /> },
      { id: 'Tarjeta', icon: <CreditCard size={18} /> },
      { id: 'Transferencia', icon: <DollarSign size={18} /> },
  ];

  const inputClass = "w-full p-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-400 transition-all";

  if (isConfirming && selectedPatient) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                 <DollarSign size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Confirmar Ingreso</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">¿Registrar este pago en el sistema?</p>
              
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6 text-left space-y-2 border border-slate-100 dark:border-slate-600">
                  <div className="flex justify-between">
                     <span className="text-xs text-slate-400 uppercase">Paciente</span>
                     <span className="text-sm font-bold text-slate-800 dark:text-white text-right">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-xs text-slate-400 uppercase">Concepto</span>
                     <span className="text-sm font-bold text-slate-800 dark:text-white text-right truncate max-w-[150px]">
                         {conceptType === 'procedure' 
                            ? pendingTreatments.find(t => t.id === selectedTreatmentId)?.procedure || 'Tratamiento'
                            : customConcept || 'Abono'}
                     </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                     <span className="text-xs text-slate-400 uppercase font-bold">Monto</span>
                     <span className="text-lg font-bold text-emerald-600">Bs {parseFloat(amountPaid).toLocaleString()}</span>
                  </div>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => setIsConfirming(false)}
                   className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                 >
                   Corregir
                 </button>
                 <button 
                   onClick={confirmAndSubmit}
                   className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
                 >
                   Confirmar
                 </button>
              </div>
           </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Styled Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
           <div>
              <h2 className="text-2xl font-bold tracking-tight">Registrar Pago</h2>
              <p className="text-xs text-emerald-100 mt-0.5 opacity-90 font-medium uppercase tracking-wide">Nuevo ingreso a caja</p>
           </div>
           <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"><X size={24} /></button>
        </div>

        <form onSubmit={handlePreSubmit} className="p-8 space-y-6 overflow-y-auto">
            
            {/* 1. Patient Selection */}
            <div>
               <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Paciente</label>
               {selectedPatient ? (
                   <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 relative group transition-colors">
                       <button 
                         type="button" 
                         onClick={() => { setSelectedPatient(null); setPendingTreatments([]); setSelectedTreatmentId(''); setAmountPaid(''); }}
                         className="absolute top-3 right-3 text-xs text-slate-400 hover:text-red-500 font-medium transition-colors"
                       >
                         Cambiar
                       </button>
                       <p className="font-bold text-slate-800 dark:text-white text-lg">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">CI: {selectedPatient.dni}</p>
                   </div>
               ) : (
                   <div className="relative">
                       <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                           type="text"
                           autoFocus
                           placeholder="Buscar paciente por nombre o CI..."
                           value={searchTerm}
                           onChange={e => setSearchTerm(e.target.value)}
                           className={inputClass + " pl-10"}
                       />
                       {searchTerm && (
                           <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-700 shadow-xl rounded-b-lg border border-t-0 border-slate-200 dark:border-slate-600 max-h-40 overflow-y-auto z-10">
                               {filteredPatients.map(p => (
                                   <div 
                                     key={p.id}
                                     onClick={() => { handleSelectPatient(p); setSearchTerm(''); }}
                                     className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer text-sm text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-600 last:border-0 transition-colors"
                                   >
                                       {p.firstName} {p.lastName}
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>
               )}
            </div>

            <div className="space-y-4">
                {/* 2. Payment Concept */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Concepto del Pago</label>
                    <div className="flex gap-2 mb-3">
                        <button type="button" onClick={() => { setConceptType('procedure'); setAmountPaid(''); }} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${conceptType === 'procedure' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>Procedimiento</button>
                        <button type="button" onClick={() => { setConceptType('custom'); setAmountPaid(''); }} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${conceptType === 'custom' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>Abono / Otro</button>
                    </div>
                    
                    {conceptType === 'procedure' ? (
                        <div className="relative">
                            <Stethoscope size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select 
                                value={selectedTreatmentId}
                                onChange={e => setSelectedTreatmentId(e.target.value)}
                                className={inputClass + " pl-10 appearance-none"}
                                disabled={!selectedPatient}
                            >
                                <option value="">Seleccione consulta pendiente...</option>
                                {pendingTreatments.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.procedure} - {new Date(t.date).toLocaleDateString()} (Bs {t.cost})
                                    </option>
                                ))}
                            </select>
                            {pendingTreatments.length === 0 && selectedPatient && (
                                <p className="text-[10px] text-slate-400 mt-1 pl-1">No se encontraron tratamientos recientes.</p>
                            )}
                        </div>
                    ) : (
                        <input 
                            type="text"
                            value={customConcept}
                            onChange={e => setCustomConcept(e.target.value)}
                            placeholder="Detalle (Ej. Pago parcial Ortodoncia...)"
                            className={inputClass}
                        />
                    )}
                </div>

                {/* 3. Amount */}
                <div>
                        <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">Monto</label>
                        <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Bs.</span>
                        <input 
                            type="number"
                            required
                            min="0"
                            step="0.5"
                            value={amountPaid}
                            onChange={e => setAmountPaid(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold placeholder:text-slate-300 shadow-sm"
                            placeholder="0.00"
                        />
                        </div>
                </div>
            </div>

            {/* Payment Method */}
            <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Método de Pago</label>
                <div className="grid grid-cols-4 gap-2">
                    {methods.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethod(m.id as PaymentMethod)}
                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-[10px] border transition-all ${
                                method === m.id 
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-medium' 
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            {m.icon} {m.id}
                        </button>
                    ))}
                </div>
            </div>

            {selectedPatient && (
                <div className="pt-2">
                   <button 
                      type="submit"
                      disabled={!amountPaid}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 tracking-wide"
                   >
                      Registrar Ingreso
                   </button>
                </div>
            )}
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
