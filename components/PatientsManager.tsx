
import React, { useState, useEffect, useRef } from 'react';
import { Patient, MedicalImage } from '../types';
import { db } from '../services/db';
import { PatientForm } from './PatientForm';
import ClinicalHistoryModal from './ClinicalHistoryModal';
import IntegralAttentionModal from './IntegralAttentionModal';
import { Search, Plus, FileText, ClipboardList, Edit, User, Filter, Zap, Stethoscope, Phone, AlertTriangle, ArrowRight, LayoutGrid, List, ArrowDownAZ, ArrowUpAZ, Clock, Calendar, HelpCircle, Info, X, Upload, Image as ImageIcon } from 'lucide-react';

interface PatientsManagerProps {
  onNavigate: (view: string) => void;
  autoOpenForm?: boolean;
}

const PatientsManager: React.FC<PatientsManagerProps> = ({ onNavigate, autoOpenForm = false }) => {
  const [patients, setPatients] = useState<Patient[]>(db.getPatients());
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(autoOpenForm);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Default to LIST
  
  // Sort State
  const [sortMode, setSortMode] = useState<'recent' | 'oldest' | 'az' | 'za'>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // State for Editing
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  // State for Integral Attention (New Consultation)
  const [patientForAttention, setPatientForAttention] = useState<Patient | null>(null);

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPatientId, setUploadingPatientId] = useState<string | null>(null);

  // Sync prop with state if it changes
  useEffect(() => {
    if (autoOpenForm) {
      setShowForm(true);
    }
  }, [autoOpenForm]);

  const refreshData = () => {
    setPatients(db.getPatients());
  };

  const handleEditPatient = (e: React.MouseEvent, patient: Patient) => {
      e.stopPropagation(); // Prevent opening history
      setSelectedPatient(null);
      setEditingPatient(patient);
      setShowForm(true);
  };

  const handleCloseForm = () => {
      setShowForm(false);
      setEditingPatient(null);
  };
  
  const handleStartAttention = (e: React.MouseEvent, patient: Patient) => {
      e.stopPropagation(); // Prevent opening history
      setPatientForAttention(patient);
  };

  const handleOpenHistory = (patient: Patient) => {
      setSelectedPatient(patient);
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleUploadClick = (e: React.MouseEvent, patientId: string) => {
      e.stopPropagation();
      setUploadingPatientId(patientId);
      // Small timeout to ensure state is set before click
      setTimeout(() => {
          fileInputRef.current?.click();
      }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && uploadingPatientId) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  // Max size for storage
                  const MAX_SIZE = 800; 
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                      if (width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                      }
                  } else {
                      if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      const base64 = canvas.toDataURL('image/jpeg', 0.8);
                      
                      const newImg: MedicalImage = {
                          id: Math.random().toString(36).substr(2, 9),
                          patientId: uploadingPatientId,
                          date: new Date().toISOString(),
                          type: 'Rayos X', // Default type
                          title: file.name,
                          imageData: base64
                      };
                      
                      db.addImage(newImg);
                      alert('Imagen subida correctamente al expediente.');
                  }
                  // Reset
                  setUploadingPatientId(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
              };
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  // Sorting Logic
  const getSortedPatients = (filtered: Patient[]) => {
      const sorted = [...filtered];
      switch (sortMode) {
          case 'recent':
              return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          case 'oldest':
              return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          case 'az':
              return sorted.sort((a, b) => a.lastName.localeCompare(b.lastName));
          case 'za':
              return sorted.sort((a, b) => b.lastName.localeCompare(a.lastName));
          default:
              return sorted;
      }
  };

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.dni.includes(searchTerm)
  );

  const displayedPatients = getSortedPatients(filteredPatients);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Hidden File Input for Image Uploads */}
      <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
      />

      {/* Patient Form Modal */}
      {showForm && (
        <PatientForm 
          onCancel={handleCloseForm} 
          onSuccess={() => {
            refreshData();
            handleCloseForm();
          }} 
          patientToEdit={editingPatient}
        />
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
           <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Directorio de Pacientes</h1>
              <p className="text-slate-500 dark:text-slate-400">Gestione expedientes, historial clínico y contacto.</p>
           </div>
           
           <div className="flex gap-3">
               <button 
                    onClick={() => setShowHelpModal(true)}
                    className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    title="Ayuda"
               >
                   <HelpCircle size={20} />
               </button>

               {/* View Toggle */}
               <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex shadow-sm">
                   <button 
                     onClick={() => setViewMode('grid')}
                     className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                     title="Vista de Tarjetas"
                   >
                       <LayoutGrid size={20} />
                   </button>
                   <button 
                     onClick={() => setViewMode('list')}
                     className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                     title="Vista de Lista"
                   >
                       <List size={20} />
                   </button>
               </div>

               <button 
                    onClick={() => setShowForm(true)}
                    className="group relative px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all overflow-hidden flex items-center gap-2"
                >
                    <Plus size={20} strokeWidth={2.5} />
                    <span>Nuevo Paciente</span>
                </button>
           </div>
      </div>

      {/* SEARCH & SORT TOOLBAR - STICKY WITH GLASS EFFECT */}
      <div className="sticky top-0 z-30 pt-2 pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-2 flex items-center gap-2 transition-all">
             <div className="relative flex-1">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por nombre, apellido o carnet..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-900 dark:text-white text-lg placeholder:text-slate-400 outline-none font-medium"
                />
             </div>
             
             {/* Sort Dropdown */}
             <div className="relative">
                 <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors border-l border-slate-200 dark:border-slate-600"
                 >
                     <Filter size={18} />
                     <span className="hidden md:inline">Ordenar</span>
                 </button>
                 
                 {showSortMenu && (
                     <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-30 animate-slide-down">
                         <div className="p-1">
                             <button onClick={() => { setSortMode('recent'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'recent' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                 <Clock size={16} /> Más Recientes
                             </button>
                             <button onClick={() => { setSortMode('oldest'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'oldest' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                 <Calendar size={16} /> Más Antiguos
                             </button>
                             <button onClick={() => { setSortMode('az'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'az' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                 <ArrowDownAZ size={16} /> Apellido (A-Z)
                             </button>
                             <button onClick={() => { setSortMode('za'); setShowSortMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${sortMode === 'za' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                 <ArrowUpAZ size={16} /> Apellido (Z-A)
                             </button>
                         </div>
                     </div>
                 )}
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 hidden md:block">
                 {displayedPatients.length} Reg.
             </div>
          </div>
      </div>
        
      {/* CONTENT VIEW (Grid or List) */}
      {displayedPatients.length > 0 ? (
        <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayedPatients.map(p => {
                        const hasAllergies = p.allergies && p.allergies !== 'Ninguna' && p.allergies !== '';
                        const hasConditions = p.medicalHistory && p.medicalHistory.length > 0;
                        
                        return (
                            <div 
                                key={p.id} 
                                onClick={() => handleOpenHistory(p)}
                                title="Clic para ver expediente"
                                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 group flex flex-col relative overflow-hidden cursor-pointer"
                            >
                                
                                {/* Top Decoration Line */}
                                <div className="h-1.5 w-full bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 group-hover:from-indigo-500 group-hover:to-purple-500 transition-all duration-500"></div>

                                <div className="p-6 flex-1">
                                    {/* Header: Avatar + Info */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold text-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shadow-inner">
                                                {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-800 dark:text-white leading-tight">{p.firstName} <br/>{p.lastName}</h3>
                                                <p className="text-sm text-slate-400 font-mono mt-1">CI: {p.dni || '---'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={(e) => handleUploadClick(e, p.id)}
                                                className="text-slate-300 hover:text-indigo-500 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full"
                                                title="Subir Estudio/Imagen"
                                            >
                                                <Upload size={20} />
                                            </button>
                                            <button 
                                                onClick={(e) => handleEditPatient(e, p)}
                                                className="text-slate-300 hover:text-indigo-500 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full"
                                                title="Editar"
                                            >
                                                <Edit size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tags / Alerts */}
                                    <div className="flex flex-wrap gap-2 mb-6 min-h-[28px]">
                                        {hasAllergies ? (
                                            <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                                <AlertTriangle size={12} strokeWidth={3} /> {p.allergies}
                                            </span>
                                        ) : (
                                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1 opacity-60">
                                                ✓ Sin Alergias
                                            </span>
                                        )}
                                        {hasConditions && (
                                            <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
                                                {p.medicalHistory.length} Antecedentes
                                            </span>
                                        )}
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-y-3 text-sm text-slate-500 dark:text-slate-400 mb-2">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="opacity-50" />
                                            <span className="text-base">{p.age ? `${p.age} años` : '--'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={16} className="opacity-50" />
                                            <span className="text-base">{p.phone || '--'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
                                    <button 
                                        onClick={(e) => handleStartAttention(e, p)}
                                        className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold shadow hover:bg-indigo-600 dark:hover:bg-indigo-100 dark:hover:text-indigo-900 transition-all group-hover:translate-x-1"
                                    >
                                        <Stethoscope size={18} />
                                        Atender
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-sm text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-5 font-bold tracking-wider">Paciente</th>
                                    <th className="px-6 py-5 font-bold tracking-wider">Documento / Contacto</th>
                                    <th className="px-6 py-5 font-bold tracking-wider">Datos Clínicos</th>
                                    <th className="px-6 py-5 font-bold tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {displayedPatients.map(p => {
                                    const hasAllergies = p.allergies && p.allergies !== 'Ninguna' && p.allergies !== '';
                                    return (
                                        <tr 
                                            key={p.id} 
                                            onClick={() => handleOpenHistory(p)}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
                                            title="Clic para ver expediente"
                                        >
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold text-lg shadow-sm">
                                                        {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-white text-lg">{p.firstName} {p.lastName}</div>
                                                        <div className="text-sm text-slate-400">{p.age ? `${p.age} años` : ''} {p.gender ? `• ${p.gender}` : ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-mono text-slate-600 dark:text-slate-300 text-base font-medium">CI: {p.dni || '---'}</span>
                                                    <span className="text-slate-500 text-sm mt-0.5 flex items-center gap-1"><Phone size={14}/> {p.phone || 'Sin celular'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex gap-2 flex-wrap">
                                                    {hasAllergies ? (
                                                        <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1">
                                                            <AlertTriangle size={12} /> {p.allergies}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm opacity-50">Sin alergias</span>
                                                    )}
                                                    {p.medicalHistory.length > 0 && (
                                                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-lg text-xs font-bold uppercase">
                                                            {p.medicalHistory.length} Antecedentes
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={(e) => handleStartAttention(e, p)}
                                                        className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 font-bold text-sm"
                                                        title="Atender"
                                                    >
                                                        <Stethoscope size={16} /> Atender
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleUploadClick(e, p.id)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                                                        title="Subir Imagen"
                                                    >
                                                        <ImageIcon size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleEditPatient(e, p)}
                                                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
      ) : (
        <div className="col-span-full py-20 text-center text-slate-400">
            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Search size={32} className="opacity-40" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No se encontraron pacientes</h3>
            <p className="text-sm opacity-70">Intente con otro término de búsqueda.</p>
        </div>
      )}

      {/* Clinical History Modal */}
      {selectedPatient && (
        <ClinicalHistoryModal 
          patient={selectedPatient} 
          onClose={() => setSelectedPatient(null)} 
        />
      )}
      
      {/* Integral Attention Modal (From button) */}
      {patientForAttention && (
          <IntegralAttentionModal 
            patient={patientForAttention}
            onClose={() => setPatientForAttention(null)}
            onSuccess={() => {
                refreshData();
                setPatientForAttention(null);
            }}
          />
      )}

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-indigo-600 p-6 flex justify-between items-start">
                  <div className="text-white">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                         <Info size={20} />
                         Guía de Pacientes
                      </h3>
                      <p className="text-indigo-100 text-xs mt-1">Gestión de expedientes y registros</p>
                  </div>
                  <button onClick={() => setShowHelpModal(false)} className="text-white/70 hover:text-white bg-white/10 p-1 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-6">
                  
                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">1</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Nuevo Registro</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Use el botón <strong>"Nuevo Paciente"</strong> para crear una ficha completa (Datos personales, Antecedentes, Alergias).
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">2</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Acceder al Historial</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Haga clic en cualquier <strong>tarjeta o fila</strong> de paciente para abrir su Historial Clínico completo e imprimirlo.
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">3</div>
                      <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">Atención Rápida</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              El botón negro <strong>"Atender"</strong> le lleva directamente a la pantalla de consulta para registrar un nuevo tratamiento.
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

export default PatientsManager;
