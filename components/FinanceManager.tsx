
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Payment, Patient, Treatment } from '../types';
import PaymentModal from './PaymentModal';
import { 
    DollarSign, TrendingUp, Users, Search, Calendar, CreditCard, ArrowUpRight, 
    Plus, Trash2, AlertTriangle, ArrowRight, ArrowUpDown, Filter, Clock,
    ArrowDownAZ, ArrowUpAZ, Activity, HelpCircle, Info, X
} from 'lucide-react';

const FinanceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'debtors'>('transactions');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debtors, setDebtors] = useState<{patient: Patient, debt: number, lastTreatmentDate: string}[]>([]);
  const [debtorSearchTerm, setDebtorSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<'highest' | 'lowest' | 'oldest' | 'newest'>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState({ totalIncome: 0, totalDebt: 0 });
  const [timeFrame, setTimeFrame] = useState<'day' | 'month' | 'year'>('month');
  const [txnSearchTerm, setTxnSearchTerm] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const refreshData = () => {
    const p = db.getPayments();
    
    // Get Debtors with Last Treatment Date for sorting
    const d = db.getDebtors().map(debtor => {
        const patientTreatments = db.getTreatmentsByPatient(debtor.patient.id);
        const lastDate = patientTreatments.length > 0 ? patientTreatments[0].date : debtor.patient.createdAt; 
        return { ...debtor, lastTreatmentDate: lastDate };
    });

    setPayments(p);
    setDebtors(d);
    
    const debt = d.reduce((acc, curr) => acc + curr.debt, 0);
    setStats(prev => ({ ...prev, totalDebt: debt }));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const calculateIncome = () => {
      const now = new Date();
      return payments.filter(p => {
          if (p.status === 'cancelled') return false;
          const d = new Date(p.date);
          if (timeFrame === 'day') return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          else if (timeFrame === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          else return d.getFullYear() === now.getFullYear();
      }).reduce((acc, curr) => acc + curr.amount, 0);
  };

  const currentIncome = calculateIncome();

  const handleOpenPayment = (patientId?: string) => {
      setSelectedDebtorId(patientId);
      setShowPaymentModal(true);
  };

  const confirmDelete = (id: string) => {
      setPaymentToDelete(id);
  };

  const handleDelete = () => {
      if (paymentToDelete) {
          db.cancelPayment(paymentToDelete);
          setPaymentToDelete(null);
          refreshData();
      }
  };

  const sortTransactions = (list: Payment[]) => {
      return list.sort((a, b) => {
          switch (sortMode) {
              case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
              case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
              case 'highest': return b.amount - a.amount;
              case 'lowest': return a.amount - b.amount;
              default: return 0;
          }
      });
  };

  const sortDebtors = (list: typeof debtors) => {
      return list.sort((a, b) => {
          switch (sortMode) {
              case 'newest': return new Date(b.lastTreatmentDate).getTime() - new Date(a.lastTreatmentDate).getTime();
              case 'oldest': return new Date(a.lastTreatmentDate).getTime() - new Date(b.lastTreatmentDate).getTime();
              case 'highest': return b.debt - a.debt;
              case 'lowest': return a.debt - b.debt;
              default: return 0;
          }
      });
  };

  const filteredPayments = sortTransactions(
      payments.filter(p => p.patientName.toLowerCase().includes(txnSearchTerm.toLowerCase()) || 
      (p.relatedProcedure && p.relatedProcedure.toLowerCase().includes(txnSearchTerm.toLowerCase())))
  );

  const processedDebtors = sortDebtors(
      debtors.filter(d => 
        d.patient.firstName.toLowerCase().includes(debtorSearchTerm.toLowerCase()) || 
        d.patient.lastName.toLowerCase().includes(debtorSearchTerm.toLowerCase()) ||
        d.patient.dni.includes(debtorSearchTerm)
      )
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-2 flex items-center justify-between">
         <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestión Financiera</h1>
         <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
            title="Ayuda"
         >
             <HelpCircle size={20} />
         </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3 mb-2 opacity-90">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg"><DollarSign size={24} /></div>
                        <span className="font-medium">Ingresos</span>
                      </div>
                      <div className="flex bg-black/20 p-1 rounded-lg text-xs font-bold">
                          <button onClick={() => setTimeFrame('day')} className={`px-2 py-1 rounded-md transition-all ${timeFrame === 'day' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-white/10'}`}>Día</button>
                          <button onClick={() => setTimeFrame('month')} className={`px-2 py-1 rounded-md transition-all ${timeFrame === 'month' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-white/10'}`}>Mes</button>
                          <button onClick={() => setTimeFrame('year')} className={`px-2 py-1 rounded-md transition-all ${timeFrame === 'year' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-100 hover:bg-white/10'}`}>Año</button>
                      </div>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight mt-2">Bs {currentIncome.toLocaleString()}</h2>
                  <p className="text-xs text-emerald-100 mt-1 opacity-80">Total registrado en este periodo</p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                  <DollarSign size={120} />
              </div>
          </div>

          <div onClick={() => setActiveTab('debtors')} className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white shadow-lg border border-transparent cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col justify-between group">
              <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3 mb-2 opacity-90">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={24} /></div>
                        <span className="font-medium">Pagos pendientes</span>
                      </div>
                      <div className="bg-white/20 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight size={16} />
                      </div>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight mt-2">Bs {stats.totalDebt.toLocaleString()}</h2>
                  <p className="text-xs text-orange-100 mt-1 opacity-90">Saldo por cobrar a pacientes</p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                  <AlertTriangle size={120} />
              </div>
          </div>

          <button onClick={() => handleOpenPayment()} className="group relative rounded-xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all flex flex-col items-center justify-center text-center gap-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all">
                  <Plus size={32} />
              </div>
              <div>
                  <h3 className="font-bold text-slate-700 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Registrar Nuevo Ingreso</h3>
                  <p className="text-xs text-slate-400 group-hover:text-emerald-600/70">Cobrar a paciente o agregar abono</p>
              </div>
          </button>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[500px]">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button onClick={() => setActiveTab('transactions')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'transactions' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                  <CreditCard size={18} /> Historial de Transacciones
              </button>
              <button onClick={() => setActiveTab('debtors')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'debtors' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                  <Users size={18} /> Deudores ({debtors.length})
              </button>
          </div>

          <div className="p-0">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder={activeTab === 'transactions' ? "Buscar por paciente o concepto..." : "Buscar deudor..."} value={activeTab === 'transactions' ? txnSearchTerm : debtorSearchTerm} onChange={(e) => activeTab === 'transactions' ? setTxnSearchTerm(e.target.value) : setDebtorSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    
                    <div className="relative">
                        <button onClick={() => setShowSortMenu(!showSortMenu)} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors shadow-sm">
                            <Filter size={16} /> <span className="hidden md:inline">Ordenar</span>
                        </button>
                        {showSortMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-30 animate-slide-down">
                                <div className="p-1">
                                    <button onClick={() => { setSortMode('newest'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'newest' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}><Clock size={16} /> Más Recientes</button>
                                    <button onClick={() => { setSortMode('oldest'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'oldest' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}><Calendar size={16} /> Más Antiguos</button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                    <button onClick={() => { setSortMode('highest'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'highest' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}><ArrowUpRight size={16} /> Mayor {activeTab === 'transactions' ? 'Monto' : 'Deuda'}</button>
                                    <button onClick={() => { setSortMode('lowest'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'lowest' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}><ArrowRight size={16} /> Menor {activeTab === 'transactions' ? 'Monto' : 'Deuda'}</button>
                                </div>
                            </div>
                        )}
                    </div>
              </div>

              {activeTab === 'transactions' ? (
                  <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Paciente</th>
                                    <th className="px-6 py-4">Procedimiento / Concepto</th>
                                    <th className="px-6 py-4">Método</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                    <th className="px-6 py-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredPayments.length > 0 ? filteredPayments.map(p => (
                                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${p.status === 'cancelled' ? 'bg-slate-50/50 dark:bg-slate-800/50 opacity-60' : ''}`}>
                                        <td className="px-6 py-6 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className={p.status === 'cancelled' ? 'line-through' : ''}>{new Date(p.date).toLocaleDateString()}</span>
                                            <span className="text-xs text-slate-400">{new Date(p.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </td>
                                        <td className="px-6 py-6 font-medium text-slate-800 dark:text-white text-base">
                                            {p.patientName}
                                            {p.status === 'cancelled' && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold">Anulado</span>}
                                        </td>
                                        <td className="px-6 py-6">
                                            {p.relatedProcedure ? (
                                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                                                    <Activity size={14} /> {p.relatedProcedure}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">{p.notes || 'Abono General'}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-xs font-medium">{p.method}</span>
                                        </td>
                                        <td className={`px-6 py-6 text-right font-bold text-base ${p.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            + Bs {p.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            {p.status !== 'cancelled' && (
                                                <button onClick={() => confirmDelete(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Anular Pago"><Trash2 size={18} /></button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="text-center py-10">No se encontraron transacciones.</td></tr>
                                )}
                            </tbody>
                        </table>
                  </div>
              ) : (
                  <div className="p-6 space-y-4">
                        {processedDebtors.length > 0 ? processedDebtors.map((d, i) => (
                            <div key={d.patient.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow bg-slate-50/30 dark:bg-slate-700/20">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-bold text-sm">{i + 1}</div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">{d.patient.firstName} {d.patient.lastName}</h4>
                                        <p className="text-xs text-slate-500 flex gap-2">
                                            <span>CI: {d.patient.dni}</span><span>•</span><span className="text-slate-400">Última atención: {new Date(d.lastTreatmentDate).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 uppercase">Deuda Pendiente</p>
                                    <p className="text-xl font-bold text-red-600">Bs {d.debt.toLocaleString()}</p>
                                    <button onClick={() => handleOpenPayment(d.patient.id)} className="mt-2 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto transition-colors shadow-sm hover:shadow">Completar Pago <ArrowUpRight size={12} /></button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-400"><p>No se encontraron deudores con esos criterios.</p></div>
                        )}
                  </div>
              )}
          </div>
      </div>

      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} onSuccess={refreshData} preSelectedPatientId={selectedDebtorId} />}

      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400"><AlertTriangle size={32} /></div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Anular Pago?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">El registro quedará marcado como "Anulado" y la deuda volverá a sumarse a la cuenta del paciente.</p>
              <div className="flex gap-3">
                 <button onClick={() => setPaymentToDelete(null)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                 <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 shadow-lg">Sí, Anular</button>
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
                         Guía Financiera
                      </h3>
                      <p className="text-indigo-100 text-xs mt-1">Control de caja y deudas</p>
                  </div>
                  <button onClick={() => setShowHelpModal(false)} className="text-white/70 hover:text-white bg-white/10 p-1 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-6">
                  
                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">1</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Historial</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Vea todos los ingresos registrados. Use el buscador para encontrar pagos específicos por paciente o concepto.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">2</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Deudores</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              La pestaña "Deudores" lista automáticamente a quienes tienen saldo pendiente. Use el botón "Completar Pago" para cobrar.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">3</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Registrar Ingreso</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Use el botón grande de "Registrar Nuevo Ingreso" (icono +) para añadir cobros manuales o abonos a cuenta.
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

export default FinanceManager;
