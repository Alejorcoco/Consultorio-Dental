
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Patient, DiagnosticSession, PrescriptionItem, OdontogramDetail, User, Appointment, Treatment, OdontogramRecord, ProcedureItem, MedicalImage, ImageType } from '../types';
import Odontogram from './Odontogram';
import ClinicalHistoryModal from './ClinicalHistoryModal'; // Imported
import TreatmentModal from './TreatmentModal'; // Imported
import { 
    Search, Stethoscope, Save, Clock, AlertTriangle, FileText, Pill, Printer, 
    X, ChevronRight, Plus, Trash2, CheckCircle2, User as UserIcon, Calendar, ArrowRight, ScrollText, Eye, Grid, Smile, Layout, ArrowLeft, HelpCircle, Info, ClipboardList, Check, CalendarPlus,
    Image as ImageIcon, Upload, Maximize2
} from 'lucide-react';

interface DiagnosticManagerProps {
    initialPatient?: Patient | null;
    user: User;
}

const DiagnosticManager: React.FC<DiagnosticManagerProps> = ({ initialPatient, user }) => {
    // --- STATE ---
    const [patient, setPatient] = useState<Patient | null>(initialPatient || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [showHelpModal, setShowHelpModal] = useState(false);
    
    // Quick Access Lists
    const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
    const [recentTreated, setRecentTreated] = useState<{patient: Patient, lastTreatment: Treatment}[]>([]);

    // History Data
    const [sessions, setSessions] = useState<DiagnosticSession[]>([]);
    
    // Form Data (Current Session)
    const [cie10Query, setCie10Query] = useState('');
    const [cie10Options, setCie10Options] = useState<{code: string, name: string}[]>([]);
    const [selectedCie10, setSelectedCie10] = useState<{code: string, name: string} | null>(null);
    const [evolutionNotes, setEvolutionNotes] = useState('');
    const [showCie10List, setShowCie10List] = useState(false); // Controls visibility of list on focus

    // Prescription State
    const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
    const [medName, setMedName] = useState('');
    const [medDose, setMedDose] = useState('');
    const [medFreq, setMedFreq] = useState('');
    const [medDur, setMedDur] = useState('');

    // New: Next Steps / Treatment Plan
    const [nextSteps, setNextSteps] = useState<string[]>([]);
    const [nextStepInput, setNextStepInput] = useState('');
    const [proceduresList, setProceduresList] = useState<ProcedureItem[]>([]);

    // Scheduling Logic from Next Steps
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [stepToSchedule, setStepToSchedule] = useState<string>('');

    // Odontogram State (Lifted & Controlled)
    const [dentitionType, setDentitionType] = useState<'adult' | 'child'>('adult');
    const [odontogramDetails, setOdontogramDetails] = useState<OdontogramDetail[]>([]);
    
    // Imaging State
    const [medicalImages, setMedicalImages] = useState<MedicalImage[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<MedicalImage | null>(null); // For Lightbox

    // Dirty State Tracking
    const [isDirty, setIsDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [exitAction, setExitAction] = useState<'back' | 'change' | null>(null);

    // Save Success Modal State
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    // History View Modal State
    const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);

    // Refs for printing
    const printFrameRef = useRef<HTMLIFrameElement>(null);

    // --- EFFECTS ---
    useEffect(() => {
        if (patient) {
            setSessions(db.getDiagnosticSessionsByPatient(patient.id));
            setProceduresList(db.getProcedures()); // Load suggestions
            setMedicalImages(db.getImagesByPatient(patient.id)); // Load images
            setPrescriptions([]);
            setEvolutionNotes('');
            setSelectedCie10(null);
            setCie10Query('');
            setNextSteps([]);
            setIsDirty(false); // Reset dirty state on new patient load
            
            // Load Odontogram State from DB or Empty
            const record = db.getOdontogram(patient.id);
            if (record) {
                setOdontogramDetails(record.details);
            } else {
                setOdontogramDetails([]);
            }
        } else {
            // Load lists for dashboard
            const startOfToday = new Date();
            startOfToday.setHours(0,0,0,0);

            const apps = db.getAppointments()
                .filter(a => a.status === 'Pendiente' && new Date(a.date) >= startOfToday)
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 10); // Show up to 10 upcoming

            setRecentAppointments(apps);
            setRecentTreated(db.getRecentTreatedPatients());
        }
    }, [patient]);

    // Track dirty state
    useEffect(() => {
        if (patient) {
             const hasNotes = evolutionNotes.length > 0;
             const hasPrescription = prescriptions.length > 0;
             const hasDiagnosis = selectedCie10 !== null;
             const hasSteps = nextSteps.length > 0;
             
             if (hasNotes || hasPrescription || hasDiagnosis || hasSteps) {
                 setIsDirty(true);
             }
        }
    }, [evolutionNotes, prescriptions, selectedCie10, nextSteps]);

    useEffect(() => {
        if (searchQuery.length > 0) {
            setSearchResults(db.searchPatients(searchQuery));
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    // CIE-10 Search Logic
    useEffect(() => {
        if (showCie10List) {
            setCie10Options(db.getCIE10Codes(cie10Query));
        }
    }, [cie10Query, showCie10List]);

    // --- HANDLERS ---
    
    // Navigation Guard
    const handleSafeExit = (action: 'back' | 'change') => {
        if (isDirty) {
            setExitAction(action);
            setShowExitConfirm(true);
        } else {
            setPatient(null);
        }
    };

    const confirmExit = () => {
        setPatient(null);
        setShowExitConfirm(false);
        setIsDirty(false);
    };

    const handleSelectPatient = (p: Patient) => {
        setPatient(p);
        setSearchQuery('');
    };

    const handleSelectFromAppointment = (appt: Appointment) => {
        const p = db.getPatient(appt.patientId);
        if (p) setPatient(p);
    };

    const handleViewHistoryOnly = (e: React.MouseEvent, p: Patient) => {
        e.stopPropagation(); 
        setHistoryPatient(p);
    };

    const handleAddPrescription = () => {
        if (medName && medDose && medFreq && medDur) {
            setPrescriptions(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                medication: medName,
                dosage: medDose,
                frequency: medFreq,
                duration: medDur
            }]);
            setMedName(''); setMedDose(''); setMedFreq(''); setMedDur('');
            setIsDirty(true);
        }
    };

    const handleRemovePrescription = (id: string) => {
        setPrescriptions(prev => prev.filter(p => p.id !== id));
        setIsDirty(true);
    };

    const handleAddNextStep = () => {
        if (nextStepInput.trim()) {
            setNextSteps(prev => [...prev, nextStepInput.trim()]);
            setNextStepInput('');
            setIsDirty(true);
        }
    };

    const handleRemoveNextStep = (index: number) => {
        setNextSteps(prev => prev.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    // Schedule Action for Next Step
    const handleScheduleStep = (stepName: string) => {
        setStepToSchedule(stepName);
        setShowScheduleModal(true);
    };

    // --- IMAGING HANDLERS ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !patient) return;

        // Optimized Image Reading
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
                    const base64 = canvas.toDataURL('image/jpeg', 0.8); // 80% quality JPG
                    
                    const newImg: MedicalImage = {
                        id: Math.random().toString(36).substr(2, 9),
                        patientId: patient.id,
                        date: new Date().toISOString(),
                        type: 'Rayos X', // Default, can be changed later if we add a modal
                        title: file.name,
                        imageData: base64
                    };
                    
                    db.addImage(newImg);
                    setMedicalImages(prev => [newImg, ...prev]);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteImage = (id: string) => {
        if(confirm('¿Eliminar imagen?')) {
            db.deleteImage(id);
            setMedicalImages(prev => prev.filter(img => img.id !== id));
        }
    };

    // ------------------------

    const handleSaveSession = () => {
        if (!patient) return;
        
        // Validation: Warn if both CIE-10 and Notes are empty
        if (!selectedCie10 && !evolutionNotes.trim()) {
            const confirmEmpty = window.confirm("No ha ingresado Diagnóstico (CIE-10) ni Notas de Evolución. ¿Desea guardar de todas formas?");
            if (!confirmEmpty) return;
        }

        // 1. Save Odontogram Current State (Overwrite record)
        const odontogramRecord: OdontogramRecord = {
            id: Math.random().toString(36).substr(2, 9), 
            patientId: patient.id,
            updatedAt: new Date().toISOString(),
            details: odontogramDetails 
        };
        db.saveOdontogram(odontogramRecord);

        // 2. Save Session History (New Space)
        const newSession: DiagnosticSession = {
            id: Math.random().toString(36).substr(2, 9),
            patientId: patient.id,
            doctorId: user.id,
            doctorName: user.name,
            date: new Date().toISOString(),
            cie10Code: selectedCie10?.code || '---',
            cie10Name: selectedCie10?.name || 'Sin diagnóstico especificado',
            evolutionNotes: evolutionNotes,
            prescription: prescriptions,
            odontogramSnapshot: [...odontogramDetails],
            nextVisitPlan: nextSteps 
        };

        db.saveDiagnosticSession(newSession);
        
        // Update local history list immediately
        setSessions(prev => [newSession, ...prev]); 
        
        // Show Success Modal instead of Alert
        setShowSaveSuccess(true);
    };

    const handleContinueDiagnosis = () => {
        setEvolutionNotes('');
        setPrescriptions([]);
        setSelectedCie10(null);
        setCie10Query('');
        setNextSteps([]);
        setIsDirty(false);
        setShowSaveSuccess(false);
    };

    const handleExitAfterSave = () => {
        setShowSaveSuccess(false);
        setPatient(null); 
    };

    const handleOdontogramChange = (newDetails: OdontogramDetail[]) => {
        setOdontogramDetails(newDetails);
        setIsDirty(true);
    };

    const handleUpdateNote = (index: number, note: string) => {
        const newDetails = [...odontogramDetails];
        newDetails[index].notes = note;
        setOdontogramDetails(newDetails);
        setIsDirty(true);
    };

    const handlePrintPrescription = () => {
        const iframe = printFrameRef.current;
        if (!iframe || prescriptions.length === 0 || !patient) return;
  
        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const dateStr = new Date().toLocaleDateString();
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Receta - ${patient.firstName} ${patient.lastName}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 20px; font-size: 12pt; }
              .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
              h1 { margin: 0; font-size: 18pt; color: #0f172a; }
              .patient-info { margin-bottom: 20px; padding: 10px; background: #f8fafc; border-radius: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              td { padding: 12px 5px; border-bottom: 1px solid #e2e8f0; }
              .med-name { font-weight: bold; font-size: 13pt; }
              .med-instructions { font-style: italic; color: #475569; margin-top: 4px; }
              .footer { margin-top: 60px; text-align: center; font-size: 10pt; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Consultorio Odontológico Taboada</h1>
              <p>RECETA MÉDICA</p>
            </div>
            <div class="patient-info">
              <strong>Paciente:</strong> ${patient.firstName} ${patient.lastName}<br>
              <strong>Fecha:</strong> ${dateStr}
            </div>
            <table>
              ${prescriptions.map(p => `
                <tr>
                  <td>
                    <div class="med-name">${p.medication} ${p.dosage}</div>
                    <div class="med-instructions">Tomar: ${p.frequency} durante ${p.duration}</div>
                  </td>
                </tr>
              `).join('')}
            </table>
            <div class="footer">
               <br><br><br>
               ________________________________<br>
               Dr. Taboada<br>
               Cirujano Dentista
            </div>
          </body>
          </html>
        `;
  
        doc.open();
        doc.write(htmlContent);
        doc.close();
        
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        }, 500);
    };

    // --- RENDER HELPERS ---
    const COLORS: any = {
        healthy: 'bg-slate-200',
        caries: 'bg-red-500',
        restoration_good: 'bg-blue-500',
        root_canal: 'bg-orange-500', 
        veneer: 'bg-cyan-400',
        whitening: 'bg-yellow-200',
        sealant: 'bg-emerald-400',
        missing: 'bg-slate-900',
        bridge: 'bg-purple-500',
        implant: 'bg-gray-500'
    };

    // --- VIEW: PATIENT SELECTION DASHBOARD ---
    if (!patient) {
        return (
            <div className="space-y-8 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Gestión de Diagnóstico</h1>
                        <p className="text-slate-500 dark:text-slate-400">Seleccione el paciente para administrar el odontograma y anotar receta médica.</p>
                    </div>
                    <button 
                        onClick={() => setShowHelpModal(true)}
                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5"
                    >
                        <HelpCircle size={18} />
                        <span className="hidden sm:inline">¿Cómo funciona?</span>
                    </button>
                </div>

                {/* Main Search Area */}
                <div className="relative rounded-2xl p-8 text-center text-white shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
                    </div>

                    <div className="relative z-10 max-w-2xl mx-auto">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <Stethoscope size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-6">Iniciar Nueva Sesión de Diagnóstico</h2>
                        
                        <div className="relative group text-left">
                            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                            <input 
                                type="text" 
                                placeholder="Buscar paciente por nombre o CI..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 shadow-lg focus:ring-4 focus:ring-white/30 outline-none text-lg font-medium transition-all"
                                autoFocus
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 text-left">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider">Coincidencias</div>
                                    {searchResults.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => handleSelectPatient(p)}
                                            className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 flex justify-between items-center group transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold">
                                                    {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 dark:text-white block text-base">{p.firstName} {p.lastName}</span>
                                                    <span className="text-xs text-slate-500">CI: {p.dni}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Access Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Citas Pendientes */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-500" />
                                Próximas Citas (Pendientes)
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {recentAppointments.length > 0 ? recentAppointments.map(app => {
                                const isToday = new Date(app.date).toDateString() === new Date().toDateString();
                                return (
                                    <div 
                                        key={app.id} 
                                        onClick={() => handleSelectFromAppointment(app)}
                                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center group transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex flex-col items-center justify-center rounded-lg w-12 h-12 transition-colors ${
                                                isToday 
                                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                            }`}>
                                                <span className="text-xs font-bold uppercase">{new Date(app.date).toLocaleDateString('es-ES', {month: 'short'})}</span>
                                                <span className="text-lg font-bold leading-none">{new Date(app.date).getDate()}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">{app.patientName}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock size={12} /> {db.formatTime(app.date)} • {app.notes ? app.notes.split('-')[0] : app.type}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Diagnosticar →</span>
                                    </div>
                                );
                            }) : (
                                <div className="p-8 text-center text-slate-400 italic text-sm">No hay citas pendientes próximas.</div>
                            )}
                        </div>
                    </div>

                    {/* Atendidos Recientemente */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Clock size={18} className="text-emerald-500" />
                                Últimos Atendidos
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {recentTreated.length > 0 ? recentTreated.map(item => (
                                <div 
                                    key={item.patient.id} 
                                    onClick={() => handleSelectPatient(item.patient)}
                                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center group transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold group-hover:scale-110 transition-transform">
                                            {item.patient.firstName.charAt(0)}{item.patient.lastName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors">{item.patient.firstName} {item.patient.lastName}</p>
                                            <p className="text-xs text-slate-500">
                                                Último trat.: {item.lastTreatment.procedure}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleViewHistoryOnly(e, item.patient)}
                                        className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center gap-1 z-20"
                                        title="Ver Historia Clínica"
                                    >
                                        <Eye size={12} /> Ver Historia
                                    </button>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-400 italic text-sm">No hay registros recientes.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* History Modal */}
                {historyPatient && (
                    <ClinicalHistoryModal 
                        patient={historyPatient} 
                        onClose={() => setHistoryPatient(null)} 
                    />
                )}

                {/* Help Modal */}
                {showHelpModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        {/* ... (Existing Help Modal Content) ... */}
                        <div className="bg-indigo-600 p-6 flex justify-between items-start">
                            <div className="text-white">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Info size={20} />
                                    Guía de Diagnóstico
                                </h3>
                                <p className="text-indigo-100 text-xs mt-1">Cómo registrar la clínica del paciente</p>
                            </div>
                            <button onClick={() => setShowHelpModal(false)} className="text-white/70 hover:text-white bg-white/10 p-1 rounded-full"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">1</div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Selección</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Busque al paciente o selecciónelo de la lista.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">2</div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Odontograma</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use las herramientas para marcar hallazgos en las piezas.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 shrink-0">3</div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Tarjetas (Derecha)</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Use los bloques verticales para llenar la <strong>Receta</strong>, el <strong>Plan de Tratamiento</strong> y las <strong>Imágenes</strong>.
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowHelpModal(false)} className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-sm hover:bg-indigo-100">Entendido</button>
                        </div>
                    </div>
                    </div>
                )}
            </div>
        );
    }

    // --- VIEW: ACTIVE DIAGNOSTIC SESSION ---
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 -m-4 md:-m-8 animate-fade-in overflow-hidden relative">
            
            <iframe ref={printFrameRef} style={{ width: 0, height: 0, position: 'absolute', border: 'none' }} title="print-frame" />

            {/* TOP BAR */}
            <div className="bg-white dark:bg-slate-800 shadow-lg border-t-4 border-t-teal-500 rounded-b-2xl mx-4 mt-2 p-4 md:px-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between z-30 relative mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-white dark:ring-slate-800">
                        {patient.firstName.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{patient.firstName} {patient.lastName}</h2>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded"><UserIcon size={12} /> {patient.age ? `${patient.age} años` : 'Edad N/A'}</span>
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded"><FileText size={12} /> CI: {patient.dni}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-wrap justify-end gap-3 items-center">
                    
                    {/* CENTER BUTTON: HISTORY */}
                    <button
                        onClick={() => setHistoryPatient(patient)}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors mx-auto border border-indigo-100 dark:border-indigo-800"
                    >
                        <ClipboardList size={18} /> Ver Historia
                    </button>

                    {/* Alerts */}
                    {patient.allergies && patient.allergies !== 'Ninguna' ? (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-800 shadow-sm">
                            <AlertTriangle size={16} />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Alergias</span>
                                <span className="text-xs font-bold leading-none">{patient.allergies}</span>
                            </div>
                        </div>
                    ) : null}

                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

                    {/* Actions: Return & Change */}
                    <button 
                        onClick={() => handleSafeExit('back')} 
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold text-sm transition-all shadow-sm" 
                        title="Volver a la búsqueda"
                    >
                        <ArrowLeft size={18} /> Volver
                    </button>
                    <button 
                        onClick={() => handleSafeExit('change')} 
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 font-bold text-sm transition-all shadow-sm" 
                        title="Salir de la sesión"
                    >
                        <X size={18} /> Cambiar Paciente
                    </button>
                </div>
            </div>

            {/* MAIN WORKSPACE - NEW GRID LAYOUT */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
                <div className="max-w-[1920px] mx-auto grid grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN: ODONTOGRAM (Col 1-8) */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                        
                        {/* ODONTOGRAM CANVAS */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[500px]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                    <Smile size={20} className="text-primary" /> Odontograma
                                </h3>
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setDentitionType('adult')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${dentitionType === 'adult' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Adulto
                                    </button>
                                    <button 
                                        onClick={() => setDentitionType('child')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${dentitionType === 'child' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Niño
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 relative flex flex-col">
                                <Odontogram 
                                    embeddedPatient={patient} 
                                    externalDentitionType={dentitionType} 
                                    currentDetails={odontogramDetails}
                                    onDetailsChange={handleOdontogramChange}
                                />
                            </div>
                        </div>

                        {/* DIAGNOSIS INPUTS & HALLAZGOS (Below Odontogram) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Findings List */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[250px]">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                    <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                        <Layout size={18} className="text-indigo-500" /> Hallazgos Registrados
                                    </h3>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                                    {odontogramDetails.length > 0 ? (
                                        <div className="space-y-3">
                                            {odontogramDetails.map((d, i) => {
                                                const condName = 
                                                d.condition === 'restoration_good' ? 'Rest. Buena' :
                                                d.condition === 'root_canal' ? 'Trat. Conducto' :
                                                d.condition === 'veneer' ? 'Carilla' :
                                                d.condition === 'whitening' ? 'Blanqueamiento' :
                                                d.condition === 'missing' ? 'Ausente' : 
                                                d.condition === 'bridge' ? 'Puente' :
                                                d.condition === 'implant' ? 'Implante' :
                                                d.condition.charAt(0).toUpperCase() + d.condition.slice(1);

                                                return (
                                                    <div key={i} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-600 flex gap-3 items-start">
                                                        <div className="flex flex-col items-center justify-center w-8 h-8 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-600 shadow-sm shrink-0">
                                                            <span className="text-xs">{d.toothNumber}</span>
                                                        </div>
                                                        <div className="flex-1 min-h-0">
                                                            <div className="text-xs font-bold text-slate-800 dark:text-white mb-1 truncate flex items-center gap-2">
                                                                {condName} <div className={`w-2 h-2 rounded-full ${COLORS[d.condition] || 'bg-slate-400'}`}></div>
                                                            </div>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Nota clínica..."
                                                                value={d.notes || ''}
                                                                onChange={(e) => handleUpdateNote(i, e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[10px] outline-none focus:border-primary transition-colors text-slate-600 dark:text-slate-300"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
                                            Sin hallazgos en la sesión.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Evolution & CIE-10 */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Diagnóstico CIE-10 (Opcional)</label>
                                    <div className="relative z-20 mb-4">
                                        {selectedCie10 ? (
                                            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="bg-indigo-100 dark:bg-indigo-800 p-1.5 rounded text-indigo-700 dark:text-indigo-300 shrink-0">
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="block font-bold text-indigo-800 dark:text-white text-xs truncate">{selectedCie10.code} - {selectedCie10.name}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedCie10(null)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-colors"><X size={16}/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <input 
                                                    value={cie10Query}
                                                    onFocus={() => setShowCie10List(true)}
                                                    onBlur={() => setTimeout(() => setShowCie10List(false), 200)}
                                                    onChange={e => setCie10Query(e.target.value)}
                                                    placeholder="Buscar CIE-10..."
                                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                                />
                                                {(showCie10List || cie10Query.length > 0) && cie10Options.length > 0 && (
                                                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-slate-100 dark:border-slate-600 max-h-48 overflow-y-auto z-50">
                                                        {cie10Options.map(opt => (
                                                            <button 
                                                                key={opt.code} 
                                                                onMouseDown={() => { setSelectedCie10(opt); setCie10Query(''); }}
                                                                className="w-full text-left px-4 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 text-xs transition-colors"
                                                            >
                                                                <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">{opt.code}</span>
                                                                <span className="text-slate-700 dark:text-slate-200">{opt.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nota de Evolución</label>
                                    <textarea 
                                        value={evolutionNotes}
                                        onChange={(e) => setEvolutionNotes(e.target.value)}
                                        className="flex-1 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none text-slate-700 dark:text-slate-200"
                                        placeholder="Procedimiento realizado y observaciones..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: STACKED CARDS (Col 9-12) */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                        
                        {/* 1. Receta Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col p-5">
                            <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 uppercase text-xs tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                <ScrollText size={18} /> Receta Médica
                            </div>
                            
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <input placeholder="Medicamento" value={medName} onChange={e => setMedName(e.target.value)} className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white placeholder:text-slate-400" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Dosis" value={medDose} onChange={e => setMedDose(e.target.value)} className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white placeholder:text-slate-400" />
                                        <input placeholder="Frecuencia" value={medFreq} onChange={e => setMedFreq(e.target.value)} className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white placeholder:text-slate-400" />
                                    </div>
                                    <div className="flex gap-2">
                                        <input placeholder="Duración" value={medDur} onChange={e => setMedDur(e.target.value)} className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white placeholder:text-slate-400" />
                                        <button onClick={handleAddPrescription} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* List */}
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {prescriptions.map((p) => (
                                        <div key={p.id} className="group flex justify-between items-start p-2 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-lg">
                                            <div>
                                                <span className="font-bold text-slate-800 dark:text-white block text-xs">{p.medication} {p.dosage}</span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Cada {p.frequency} • {p.duration}</span>
                                            </div>
                                            <button onClick={() => handleRemovePrescription(p.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                    {prescriptions.length === 0 && <div className="text-center text-slate-400 text-[10px] italic py-2">Lista vacía.</div>}
                                </div>

                                {prescriptions.length > 0 && (
                                    <button onClick={handlePrintPrescription} className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors border border-indigo-200 flex items-center justify-center gap-2">
                                        <Printer size={12} /> Imprimir
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 2. Plan Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col p-5">
                            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                <ClipboardList size={18} /> Plan de Tratamiento
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex gap-2 relative">
                                    <input 
                                        list="plan-procedures"
                                        value={nextStepInput}
                                        onChange={(e) => setNextStepInput(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') handleAddNextStep(); }}
                                        placeholder="Siguiente paso..."
                                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs outline-none focus:border-emerald-500 bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white"
                                    />
                                    <datalist id="plan-procedures">
                                        {proceduresList.map(p => (
                                            <option key={p.id} value={p.name} />
                                        ))}
                                    </datalist>
                                    <button 
                                        onClick={handleAddNextStep}
                                        disabled={!nextStepInput.trim()}
                                        className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 shadow-sm"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {nextSteps.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 group">
                                            <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-500 shrink-0"></div>
                                            <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{step}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleScheduleStep(step)}
                                                    className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                                    title="Agendar"
                                                >
                                                    <CalendarPlus size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleRemoveNextStep(idx)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {nextSteps.length === 0 && <div className="text-center text-slate-400 text-[10px] italic py-2">Sin pasos futuros.</div>}
                                </div>
                            </div>
                        </div>

                        {/* 3. Images Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col p-5 flex-1 min-h-[200px]">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 uppercase text-xs tracking-wider">
                                    <ImageIcon size={18} /> Imágenes
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                                    title="Subir Imagen"
                                >
                                    <Upload size={14} />
                                </button>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                />
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-60">
                                {medicalImages.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {medicalImages.map(img => (
                                            <div key={img.id} className="relative group bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <div 
                                                    className="aspect-square bg-slate-100 cursor-pointer relative"
                                                    onClick={() => setSelectedImage(img)}
                                                >
                                                    <img src={img.imageData} alt={img.title} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <Maximize2 className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={20} />
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteImage(img.id)}
                                                    className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-white transition-all shadow-sm"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic">
                                        Sin imágenes.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Final Action Button (Moved inside column for better mobile flow, or keep at bottom) */}
                        <button 
                            onClick={handleSaveSession}
                            className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 flex-shrink-0 mt-2"
                        >
                            <Save size={20} /> Guardar Diagnóstico
                        </button>
                    </div>

                </div>
            </div>

            {/* LIGHTBOX FOR IMAGES */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <img src={selectedImage.imageData} alt={selectedImage.title} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                        <div className="mt-4 text-center">
                            <h3 className="text-white font-bold text-lg">{selectedImage.title}</h3>
                            <p className="text-white/70 text-sm">{new Date(selectedImage.date).toLocaleDateString()} - {selectedImage.type}</p>
                        </div>
                        <button 
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                        >
                            <X size={32} />
                        </button>
                    </div>
                </div>
            )}

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Salir sin guardar?</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            Tiene cambios no guardados en el diagnóstico. Si sale ahora, se perderán.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmExit}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:shadow-lg hover:bg-red-700"
                            >
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Success Modal */}
            {showSaveSuccess && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                        <div className="bg-emerald-500 p-6 flex justify-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce-short">
                                <Check size={40} className="text-emerald-500" strokeWidth={4} />
                            </div>
                        </div>
                        <div className="p-6 text-center">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Guardado con Éxito!</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                                La sesión clínica ha sido registrada en el historial del paciente.
                            </p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={handleContinueDiagnosis}
                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
                                >
                                    Continuar Diagnóstico
                                </button>
                                <button 
                                    onClick={handleExitAfterSave}
                                    className="w-full py-3.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-all"
                                >
                                    Salir al Inicio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule From Plan Modal */}
            {showScheduleModal && patient && (
                <TreatmentModal 
                    onClose={() => setShowScheduleModal(false)}
                    onSuccess={() => {
                        setShowScheduleModal(false);
                    }}
                    preSelectedPatientId={patient.id}
                    initialProcedure={stepToSchedule}
                />
            )}
            
            {/* History Modal (Fixed: Now renders even in active session) */}
            {historyPatient && (
                <ClinicalHistoryModal 
                    patient={historyPatient} 
                    onClose={() => setHistoryPatient(null)} 
                />
            )}

        </div>
    );
};

export default DiagnosticManager;
