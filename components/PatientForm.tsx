
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Patient, Medication } from '../types';
import { 
  UserPlus, Save, X, Activity, Ruler, Phone, FileText, Check, 
  AlertCircle, User, Heart, Plus, Trash2, Pill, AlertTriangle, 
  MapPin, Briefcase, Fingerprint, ChevronDown, ChevronUp, ArrowLeft, Calendar, Camera, Upload
} from 'lucide-react';

interface PatientFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  patientToEdit?: Patient | null;
  initialName?: string;
  initialCi?: string;
}

export const PatientForm: React.FC<PatientFormProps> = ({ onCancel, onSuccess, patientToEdit, initialName, initialCi }) => {
  // --- STATE ---
  const initialFormData = {
    firstName: '',
    lastName: '',
    dni: '', 
    phone: '',
    generalDescription: '',
    email: '',
    age: '',
    birthDate: '', // New Field
    weight: '',
    height: '',
    gender: '' as 'Masculino' | 'Femenino' | 'Otro' | '',
    civilStatus: '' as 'Soltero/a' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Unión Libre' | '',
    occupation: '',
    medicalHistory: [] as string[]
  };

  const [formData, setFormData] = useState(initialFormData);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null); // State for Photo
  const [errors, setErrors] = useState<{[key: string]: boolean | string}>({});
  
  // Lists
  const [allergyTags, setAllergyTags] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationInput, setMedicationInput] = useState(''); // Unified input for meds

  // UI States
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); // New Delete State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // Collapsible state
  const [customHistoryInput, setCustomHistoryInput] = useState('');
  
  // Suggestions
  const [commonReasons, setCommonReasons] = useState<string[]>([]);

  // Refs for checking clicks outside if needed, or focused elements
  const formRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    setCommonReasons(db.getConsultationReasons());

    if (patientToEdit) {
        setFormData({
            firstName: patientToEdit.firstName,
            lastName: patientToEdit.lastName,
            dni: patientToEdit.dni,
            phone: patientToEdit.phone || '',
            generalDescription: patientToEdit.generalDescription,
            email: patientToEdit.email || '',
            age: patientToEdit.age || '',
            birthDate: patientToEdit.birthDate || '',
            weight: patientToEdit.weight || '',
            height: patientToEdit.height || '',
            gender: patientToEdit.gender || '',
            civilStatus: patientToEdit.civilStatus || '',
            occupation: patientToEdit.occupation || '',
            medicalHistory: patientToEdit.medicalHistory || []
        });
        
        if (patientToEdit.photo) {
            setPatientPhoto(patientToEdit.photo);
        }
        
        if (patientToEdit.allergies && patientToEdit.allergies !== 'Ninguna') {
            setAllergyTags(patientToEdit.allergies.split(',').map(s => s.trim()).filter(s => s));
        }

        if (patientToEdit.currentMedications) {
            setMedications(patientToEdit.currentMedications);
        }
        // Open history if there are items
        if (patientToEdit.medicalHistory && patientToEdit.medicalHistory.length > 0) {
            setIsHistoryOpen(true);
        }
    } else {
        // Handle Initial Values from Search
        if (initialName) {
            const parts = initialName.trim().split(' ');
            if (parts.length > 0) {
                const first = parts[0];
                const last = parts.slice(1).join(' ');
                setFormData(prev => ({ ...prev, firstName: first, lastName: last }));
            }
        }
        if (initialCi) {
            setFormData(prev => ({ ...prev, dni: initialCi }));
        }
    }
  }, [patientToEdit, initialName, initialCi]);

  // Gender Inference
  useEffect(() => {
      if (!patientToEdit && formData.firstName && !formData.gender) {
          const firstWord = formData.firstName.trim().split(' ')[0].toLowerCase();
          if (firstWord.length > 2) {
              if (firstWord.endsWith('a')) {
                  setFormData(prev => ({ ...prev, gender: 'Femenino' }));
              } else if (firstWord.endsWith('o') || firstWord.endsWith('os')) {
                  setFormData(prev => ({ ...prev, gender: 'Masculino' }));
              }
          }
      }
  }, [formData.firstName, patientToEdit, formData.gender]);

  // Auto Age Calculation
  useEffect(() => {
      if (formData.birthDate) {
          const today = new Date();
          const birthDate = new Date(formData.birthDate);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
          }
          if (age >= 0) {
             setFormData(prev => ({...prev, age: age.toString() }));
          }
      }
  }, [formData.birthDate]);

  // --- LOGIC ---

  // Check if form has unsaved data
  const hasUnsavedChanges = () => {
      // Simple check against empty/initial state
      if (patientToEdit) return true; // Always confirm when editing existing
      
      const hasBasicData = formData.firstName || formData.lastName || formData.dni || formData.phone || formData.generalDescription;
      const hasLists = allergyTags.length > 0 || medications.length > 0 || patientPhoto !== null;
      
      return hasBasicData || hasLists;
  };

  const handleCancelRequest = () => {
      if (hasUnsavedChanges()) {
          setShowConfirmDiscard(true);
      } else {
          onCancel();
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error on change
    if (errors[e.target.name]) {
        setErrors(prev => ({ ...prev, [e.target.name]: false }));
    }
  };

  // --- PHOTO UPLOAD LOGIC ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  // Resize to square 300x300 for profile
                  const MAX_SIZE = 300; 
                  let width = img.width;
                  let height = img.height;

                  // Center crop logic
                  const minDim = Math.min(width, height);
                  const sx = (width - minDim) / 2;
                  const sy = (height - minDim) / 2;

                  canvas.width = MAX_SIZE;
                  canvas.height = MAX_SIZE;
                  
                  if (ctx) {
                      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);
                      const base64 = canvas.toDataURL('image/jpeg', 0.8);
                      setPatientPhoto(base64);
                  }
              };
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(confirm('¿Quitar foto de perfil?')) {
          setPatientPhoto(null);
      }
  };

  // --- PHONE VALIDATION LOGIC ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
      
      // Validation: Must start with 6 or 7
      if (val.length > 0) {
          const firstChar = val.charAt(0);
          if (firstChar !== '6' && firstChar !== '7') {
              return; 
          }
      }

      // Max length 8
      if (val.length > 8) {
          val = val.slice(0, 8);
      }

      setFormData({ ...formData, phone: val });
      
      if (errors.phone) {
          setErrors(prev => ({ ...prev, phone: false }));
      }
  };

  // Biometrics with limits and no-spinner logic
  const handleBiometricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Allow empty to delete
    if (value === '') { 
        setFormData({ ...formData, [name]: '' }); 
        return; 
    }

    let val = parseFloat(value);
    
    // Limits
    if (name === 'age') {
        if (val < 0) val = 0;
        if (val > 120) val = 120; // Reasonable max age
    } else if (name === 'weight') {
        if (val < 0) val = 0;
        if (val > 300) val = 300; // Max kg
    } else if (name === 'height') {
        if (val < 0) val = 0;
        if (val > 250) val = 250; // Max cm
    }

    setFormData({ ...formData, [name]: val.toString() });
  };

  const setGender = (g: 'Masculino' | 'Femenino' | 'Otro') => {
      setFormData(prev => ({ ...prev, gender: g }));
  };

  // --- LIST HANDLERS ---

  // Allergies
  const handleAddAllergy = () => {
      if (allergyInput.trim()) {
          setAllergyTags([...allergyTags, allergyInput.trim()]);
          setAllergyInput('');
      }
  };
  const handleRemoveAllergy = (index: number) => {
      setAllergyTags(allergyTags.filter((_, i) => i !== index));
  };

  // Medications (Unified Style)
  const handleAddMedication = () => {
      if (medicationInput.trim()) {
          // Creating a simple medication object from the string
          const newMed: Medication = {
              name: medicationInput.trim(),
              dosage: '', // Simplification for UI
              frequency: ''
          };
          setMedications([...medications, newMed]);
          setMedicationInput('');
      }
  };
  const handleRemoveMedication = (index: number) => {
      setMedications(medications.filter((_, i) => i !== index));
  };

  // Medical History
  const handleCheckbox = (value: string) => {
    setFormData(prev => {
      const history = prev.medicalHistory.includes(value)
        ? prev.medicalHistory.filter(h => h !== value)
        : [...prev.medicalHistory, value];
      return { ...prev, medicalHistory: history };
    });
  };

  const handleAddCustomHistory = () => {
      if (customHistoryInput.trim()) {
          setFormData(prev => ({
              ...prev,
              medicalHistory: [...prev.medicalHistory, customHistoryInput.trim()]
          }));
          setCustomHistoryInput('');
      }
  };

  const handleReasonClick = (reason: string) => {
    setFormData(prev => ({
      ...prev,
      generalDescription: prev.generalDescription ? `${prev.generalDescription}, ${reason}` : reason
    }));
    // Clear error if exists
    if (errors['generalDescription']) {
        setErrors(prev => ({ ...prev, generalDescription: false }));
    }
  };

  // VALIDATION & SUBMIT
  const validateForm = () => {
      const newErrors: {[key: string]: boolean | string} = {};
      let isValid = true;

      if (!formData.firstName.trim()) { newErrors.firstName = true; isValid = false; }
      if (!formData.lastName.trim()) { newErrors.lastName = true; isValid = false; }
      
      if (!formData.generalDescription.trim()) { newErrors.generalDescription = true; isValid = false; }

      // Validate Phone
      if (formData.phone && formData.phone.length !== 8) {
          newErrors.phone = "El celular debe tener 8 dígitos";
          isValid = false;
      }

      setErrors(newErrors);
      return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
        setShowConfirmSave(true);
    }
  };

  const confirmSave = () => {
    const finalData: Patient = {
        id: patientToEdit ? patientToEdit.id : '',
        ...formData,
        photo: patientPhoto || undefined,
        gender: formData.gender === '' ? undefined : formData.gender, // Handle empty string
        civilStatus: formData.civilStatus === '' ? undefined : formData.civilStatus, // Handle empty string
        allergies: allergyTags.length > 0 ? allergyTags.join(', ') : 'Ninguna',
        currentMedications: medications,
        createdAt: patientToEdit ? patientToEdit.createdAt : new Date().toISOString()
    };

    if (patientToEdit) {
        db.updatePatient(patientToEdit.id, finalData);
    } else {
        db.addPatient(finalData);
    }
    setShowConfirmSave(false);
    onSuccess();
  };

  const handleDelete = () => {
      if (patientToEdit) {
          db.deletePatient(patientToEdit.id);
          setShowConfirmDelete(false);
          onSuccess();
      }
  };

  const medicalConditions = [
    { id: 'Hipertensión', label: 'Hipertensión', icon: '❤️' },
    { id: 'Diabetes', label: 'Diabetes', icon: '🍬' },
    { id: 'Cardiopatía', label: 'Cardiopatía', icon: '💓' },
    { id: 'Coagulación', label: 'Coagulación', icon: '🩸' },
    { id: 'Alergia Anestesia', label: 'Alg. Anestesia', icon: '💉' },
    { id: 'Embarazo', label: 'Embarazo', icon: '🤰' },
    { id: 'Fumador', label: 'Fumador', icon: '🚬' },
    { id: 'Respiratorio', label: 'Respiratorio', icon: '🫁' },
    { id: 'Hepatitis', label: 'Hepatitis', icon: '🦠' },
    { id: 'Renal', label: 'Renal', icon: '🌊' },
    { id: 'Gastritis', label: 'Gastritis', icon: '🔥' },
    { id: 'Bruxismo', label: 'Bruxismo', icon: '😬' },
  ];

  const baseInputClass = "w-full bg-white dark:bg-slate-700 border rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400";
  const defaultBorder = "border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
  const errorBorder = "border-red-500 ring-1 ring-red-500 focus:border-red-600";

  const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide";
  const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]" ref={formRef}>
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                 <UserPlus size={28} />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                    {patientToEdit ? 'Editar Expediente' : 'Nuevo Paciente'}
                 </h2>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {patientToEdit ? 'Actualice la información clínica y personal.' : 'Complete los campos obligatorios (*) para registrar.'}
                 </p>
              </div>
           </div>
           <div className="flex gap-3">
               {patientToEdit && (
                   <button 
                        onClick={() => setShowConfirmDelete(true)} 
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-100 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors mr-2"
                   >
                       <Trash2 size={18} />
                       Eliminar Paciente
                   </button>
               )}
               <button onClick={handleCancelRequest} className="px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium">Cancelar</button>
               <button 
                 onClick={handleSubmit} 
                 className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg hover:to-teal-700 transition-all flex items-center gap-2 text-sm transform hover:-translate-y-0.5"
               >
                   <Save size={18} />
                   {patientToEdit ? 'Guardar Cambios' : 'Registrar Paciente'}
               </button>
           </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* COL 1: IDENTITY & DEMOGRAPHICS (5 Columns) */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* A. Identity Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 dark:text-slate-500 uppercase text-xs font-bold tracking-widest">
                            <Fingerprint size={14} /> Identificación
                        </div>
                        
                        {/* PHOTO UPLOADER */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <button 
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl overflow-hidden border-4 shadow-md transition-all hover:scale-105 active:scale-95 bg-slate-100 border-slate-50 dark:bg-slate-700 dark:border-slate-600 group-hover:border-indigo-200 relative`}
                                >
                                    {patientPhoto ? (
                                        <img src={patientPhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-slate-300 dark:text-slate-500">
                                            {formData.firstName ? (
                                                <span className="font-bold uppercase">{formData.firstName.charAt(0)}</span>
                                            ) : (
                                                <User size={48} strokeWidth={1.5} />
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Overlay Hover Effect */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors rounded-full">
                                        <Camera size={24} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                    </div>
                                </button>
                                
                                {patientPhoto && (
                                    <button 
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        className="absolute top-0 right-0 bg-white dark:bg-slate-600 text-red-500 rounded-full p-1.5 shadow-md border border-slate-100 dark:border-slate-500 hover:bg-red-50 transition-colors"
                                        title="Eliminar foto"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={photoInputRef}
                                onChange={handlePhotoUpload}
                            />
                            
                            {/* GENDER SELECTOR - Redesigned to sit below photo */}
                            <div className="flex items-center gap-2 mt-4 bg-slate-50 dark:bg-slate-700/50 p-1 rounded-lg border border-slate-100 dark:border-slate-600">
                                <button 
                                    type="button" 
                                    onClick={() => setGender('Masculino')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${formData.gender === 'Masculino' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                                >
                                    Masculino
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setGender('Femenino')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${formData.gender === 'Femenino' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                                >
                                    Femenino
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setGender('Otro')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${formData.gender === 'Otro' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                                >
                                    Otro
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Nombre(s) <span className="text-red-500">*</span></label>
                                    <input 
                                        name="firstName" 
                                        value={formData.firstName} 
                                        onChange={handleChange} 
                                        className={`${baseInputClass} ${errors.firstName ? errorBorder : defaultBorder}`}
                                        placeholder="Nombres" 
                                        autoFocus 
                                    />
                                    {errors.firstName && <span className="text-[10px] text-red-500 font-medium">Requerido</span>}
                                </div>
                                <div>
                                    <label className={labelClass}>Apellidos <span className="text-red-500">*</span></label>
                                    <input 
                                        name="lastName" 
                                        value={formData.lastName} 
                                        onChange={handleChange} 
                                        className={`${baseInputClass} ${errors.lastName ? errorBorder : defaultBorder}`}
                                        placeholder="Apellidos" 
                                    />
                                    {errors.lastName && <span className="text-[10px] text-red-500 font-medium">Requerido</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Carnet de Identidad (CI)</label>
                                    <input 
                                        name="dni" 
                                        value={formData.dni} 
                                        onChange={handleChange} 
                                        className={`${baseInputClass} ${defaultBorder}`}
                                        placeholder="1234567 LP" 
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Celular</label>
                                    <input 
                                        name="phone" 
                                        value={formData.phone} 
                                        onChange={handlePhoneChange} 
                                        className={`${baseInputClass} ${errors.phone ? errorBorder : defaultBorder}`}
                                        placeholder="Ej. 70000000" 
                                        maxLength={8}
                                    />
                                    {errors.phone && <span className="text-[10px] text-red-500 font-medium block leading-tight mt-1">{errors.phone}</span>}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Fecha de Nacimiento</label>
                                <input 
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    className={`${baseInputClass} ${defaultBorder}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* B. Demographics & Bio */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 dark:text-slate-500 uppercase text-xs font-bold tracking-widest">
                            <MapPin size={14} /> Demografía & Biometría
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Ocupación</label>
                                    <div className="relative">
                                        <Briefcase size={14} className="absolute left-3 top-3 text-slate-400" />
                                        <input name="occupation" value={formData.occupation} onChange={handleChange} className={baseInputClass + " pl-9 " + defaultBorder} placeholder="Ej. Abogado" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Estado Civil</label>
                                    <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} className={`${baseInputClass} ${defaultBorder}`}>
                                        <option value="">Seleccione...</option>
                                        <option value="Soltero/a">Soltero/a</option>
                                        <option value="Casado/a">Casado/a</option>
                                        <option value="Divorciado/a">Divorciado/a</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* UPDATED: Biometrics restored here */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                 <div className="text-center px-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Edad</label>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <input name="age" type="number" value={formData.age} onChange={handleBiometricChange} className={`w-12 text-center font-bold text-lg bg-transparent border-b border-transparent focus:border-primary outline-none text-slate-800 dark:text-white ${noSpinnerClass}`} placeholder="-" readOnly={!!formData.birthDate} />
                                        <span className="text-xs text-slate-400">años</span>
                                    </div>
                                </div>
                                <div className="text-center px-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Peso</label>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <input name="weight" type="number" value={formData.weight} onChange={handleBiometricChange} className={`w-12 text-center font-bold text-lg bg-transparent border-b border-transparent focus:border-primary outline-none text-slate-800 dark:text-white ${noSpinnerClass}`} placeholder="-" />
                                        <span className="text-xs text-slate-400">kg</span>
                                    </div>
                                </div>
                                <div className="text-center px-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Altura</label>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <input name="height" type="number" value={formData.height} onChange={handleBiometricChange} className={`w-12 text-center font-bold text-lg bg-transparent border-b border-transparent focus:border-primary outline-none text-slate-800 dark:text-white ${noSpinnerClass}`} placeholder="-" />
                                        <span className="text-xs text-slate-400">cm</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* COL 2: CLINICAL DATA (7 Columns) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* ... (Clinical data sections remain unchanged, just rendered) ... */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-500 uppercase text-xs font-bold tracking-widest">
                            <FileText size={14} /> Motivo de Consulta <span className="text-red-500">*</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                            {commonReasons.map(reason => (
                                <button
                                    key={reason}
                                    type="button"
                                    onClick={() => handleReasonClick(reason)}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-amber-600 hover:border-amber-300 border border-transparent shadow-sm transition-all"
                                >
                                    + {reason}
                                </button>
                            ))}
                        </div>
                        <textarea
                            name="generalDescription"
                            rows={3}
                            value={formData.generalDescription}
                            onChange={handleChange}
                            className={`w-full bg-white dark:bg-slate-800 border rounded-xl p-4 text-sm text-slate-900 dark:text-white outline-none resize-none placeholder:text-slate-400 ${errors.generalDescription ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-amber-200 dark:border-amber-700 focus:ring-2 focus:ring-amber-400'}`}
                            placeholder="Describa el motivo principal de la visita..."
                        />
                        {errors.generalDescription && <p className="text-[10px] text-red-500 font-medium mt-1">Este campo es obligatorio</p>}
                    </div>

                    {/* Medical History */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button 
                            type="button"
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 uppercase text-xs font-bold tracking-widest">
                                <Activity size={14} /> Antecedentes Patológicos
                                {formData.medicalHistory.length > 0 && (
                                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[10px] ml-2">
                                        {formData.medicalHistory.length}
                                    </span>
                                )}
                            </div>
                            {isHistoryOpen ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                        </button>
                        
                        {isHistoryOpen && (
                            <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-700/50 animate-slide-down">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 mt-4">
                                    {medicalConditions.map(item => {
                                        const isSelected = formData.medicalHistory.includes(item.id);
                                        return (
                                            <div 
                                                key={item.id}
                                                onClick={() => handleCheckbox(item.id)}
                                                className={`cursor-pointer p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-50 border-slate-200 dark:border-slate-600 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                                            >
                                                <span className="text-base">{item.icon}</span>
                                                <span className="flex-1 truncate">{item.label}</span>
                                                {isSelected && <Check size={12} />}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div className="flex gap-2">
                                    <input 
                                        value={customHistoryInput}
                                        onChange={(e) => setCustomHistoryInput(e.target.value)}
                                        placeholder="Otro antecedente (Escribir...)"
                                        className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCustomHistory(); }}}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleAddCustomHistory} 
                                        className="bg-indigo-50 text-indigo-600 border border-indigo-200 p-2 rounded-lg hover:bg-indigo-100"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.medicalHistory.filter(h => !medicalConditions.some(mc => mc.id === h)).map(h => (
                                        <span key={h} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                                            {h} <button type="button" onClick={() => handleCheckbox(h)}><X size={10}/></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Allergies & Meds */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Allergies */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                            <div className="flex items-center gap-2 mb-3 text-rose-500 uppercase text-xs font-bold tracking-widest">
                                <AlertTriangle size={14} /> Alergias
                            </div>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    value={allergyInput}
                                    onChange={(e) => setAllergyInput(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddAllergy(); }}}
                                    placeholder="Añadir..."
                                    className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                />
                                <button type="button" onClick={handleAddAllergy} className="bg-rose-50 text-rose-500 p-1.5 rounded-lg hover:bg-rose-100 border border-rose-100"><Plus size={16}/></button>
                            </div>
                            <div className="flex-1 flex flex-wrap content-start gap-2 min-h-[60px] bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                                {allergyTags.map((tag, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-100 dark:border-slate-500">
                                        {tag} <button type="button" onClick={() => handleRemoveAllergy(i)}><X size={10}/></button>
                                    </span>
                                ))}
                                {allergyTags.length === 0 && <span className="text-xs text-slate-400 italic w-full text-center mt-2">Ninguna registrada</span>}
                            </div>
                        </div>

                        {/* Medications */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                            <div className="flex items-center gap-2 mb-3 text-emerald-500 uppercase text-xs font-bold tracking-widest">
                                <Pill size={14} /> Medicación Actual
                            </div>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    value={medicationInput}
                                    onChange={(e) => setMedicationInput(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddMedication(); }}}
                                    placeholder="Nombre y dosis..."
                                    className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                />
                                <button type="button" onClick={handleAddMedication} className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-100 border border-emerald-100"><Plus size={16}/></button>
                            </div>
                            <div className="flex-1 flex flex-wrap content-start gap-2 min-h-[60px] bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                                {medications.map((m, i) => (
                                    <div key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-600 shadow-sm text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-slate-500">
                                        {m.name} {m.dosage && `(${m.dosage})`}
                                        <button type="button" onClick={() => handleRemoveMedication(i)} className="ml-1 hover:text-red-500"><X size={10}/></button>
                                    </div>
                                ))}
                                {medications.length === 0 && <span className="text-xs text-slate-400 italic w-full text-center mt-2">Sin medicación</span>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* SAVE CONFIRMATION */}
        {showConfirmSave && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 text-center max-w-sm w-full mx-4 border border-slate-100 dark:border-slate-700 animate-slide-up">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400">
                 <Check size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {patientToEdit ? '¿Actualizar Datos?' : '¿Registrar Paciente?'}
              </h3>
              <div className="flex gap-3 mt-5">
                 <button onClick={() => setShowConfirmSave(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50">Volver</button>
                 <button onClick={confirmSave} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow hover:bg-emerald-700">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {/* DISCARD CONFIRMATION */}
      {showConfirmDiscard && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 text-center max-w-sm w-full mx-4 border border-slate-100 dark:border-slate-700 animate-slide-up">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600 dark:text-red-400">
                 <X size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">¿Descartar Cambios?</h3>
              <p className="text-sm text-slate-500 mb-4">La información ingresada no se guardará.</p>
              <div className="flex gap-3 mt-5">
                 <button onClick={() => setShowConfirmDiscard(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50">Seguir Editando</button>
                 <button onClick={onCancel} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow hover:bg-red-700">Sí, Salir</button>
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {showConfirmDelete && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 text-center max-w-sm w-full mx-4 border border-slate-100 dark:border-slate-700 animate-slide-up">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600 dark:text-red-400">
                 <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Eliminar Paciente?</h3>
              <p className="text-sm text-red-500 dark:text-red-400 mb-2 font-bold">
                  ADVERTENCIA: Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 mt-5">
                 <button onClick={() => setShowConfirmDelete(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                 <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow hover:bg-red-700">Sí, Eliminar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
