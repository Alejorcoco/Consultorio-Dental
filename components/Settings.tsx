
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, ProcedureItem } from '../types';
import { db } from '../services/db';
import { 
  Moon, Sun, Shield, User as UserIcon, Clock, Plus, Edit2, 
  Trash2, Save, X, Lock, Database, Tag, ChevronDown, ChevronUp, Image as ImageIcon, Upload, Calendar, AlertTriangle
} from 'lucide-react';

interface SettingsProps {
  user: User;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, isDarkMode, toggleTheme }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Data Management Accordion State - COLLAPSED BY DEFAULT
  const [isProceduresOpen, setIsProceduresOpen] = useState(false); 

  // Data State
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  
  // Forms for Data
  const [newProcName, setNewProcName] = useState('');
  const [newProcPrice, setNewProcPrice] = useState('');

  // User Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>(UserRole.STAFF);

  // Logo State
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Schedule State
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(18);

  useEffect(() => {
    setUsers(db.getUsers());
    setCurrentLogo(db.getLogo());
    refreshData();
    const schedule = db.getSchedule();
    setStartHour(schedule.startHour);
    setEndHour(schedule.endHour);
  }, []);

  const refreshData = () => {
      setProcedures(db.getProcedures());
  };

  const handleSaveSchedule = () => {
      db.setSchedule({ startHour, endHour });
      alert('Horario de atención actualizado.');
  };

  // --- Handlers for Logo (OPTIMIZED) ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  // Create canvas for resizing
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  // Max dimensions (250px is enough for UI logos)
                  const MAX_SIZE = 250; 
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
                      // Compress to PNG (or JPEG if you prefer smaller size, but PNG handles transparency)
                      const optimizedBase64 = canvas.toDataURL('image/png'); 
                      
                      db.setLogo(optimizedBase64);
                      setCurrentLogo(optimizedBase64);
                      alert('Logo actualizado y optimizado correctamente. Recargue la página para ver cambios en toda la app.');
                  }
              };
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveLogo = () => {
      if(confirm('¿Eliminar el logo personalizado y volver al predeterminado?')) {
          db.setLogo(null);
          setCurrentLogo(null);
      }
  };

  // --- Handlers for User Management ---
  const handleOpenModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormName(userToEdit.name);
      setFormUsername(userToEdit.username);
      setFormPassword(userToEdit.password || '');
      setFormRole(userToEdit.role);
    } else {
      setEditingUser(null);
      setFormName('');
      setFormUsername('');
      setFormPassword('');
      setFormRole(UserRole.STAFF);
    }
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      db.updateUser(editingUser.id, {
        name: formName,
        username: formUsername,
        password: formPassword,
        role: formRole
      });
    } else {
      db.addUser({
        name: formName,
        username: formUsername,
        password: formPassword,
        role: formRole
      });
    }
    setUsers(db.getUsers());
    setShowUserModal(false);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      db.deleteUser(id);
      setUsers(db.getUsers());
    }
  };

  // --- Handlers for Data Management ---
  const handleAddProcedure = (e: React.FormEvent) => {
      e.preventDefault();
      if(newProcName && newProcPrice) {
          db.addProcedure({ name: newProcName, price: parseFloat(newProcPrice) });
          setNewProcName('');
          setNewProcPrice('');
          refreshData();
      }
  };

  const handleDeleteProcedure = (id: string) => {
      if(confirm('¿Eliminar este motivo/tratamiento de la lista?')) {
          db.removeProcedure(id);
          refreshData();
      }
  };

  // Consistent input class
  const inputClass = "w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none";

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración del Sistema</h2>
          <p className="text-slate-500 dark:text-slate-400">Personalización y gestión de accesos.</p>
        </div>
      </div>

      {/* 1. Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Apariencia</h3>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-amber-400 text-white'}`}>
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">Tema del Sistema</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isDarkMode ? 'Modo Oscuro activado' : 'Modo Claro activado'}</p>
                </div>
            </div>
            <button 
                onClick={toggleTheme}
                className={`
                relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none
                ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}
                `}
            >
                <span
                className={`
                    inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                    ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}
                `}
                />
            </button>
        </div>
      </div>

      {/* 2. Clinic Schedule */}
      {(user.role === UserRole.PRINCIPAL || user.role === UserRole.DOCTOR) && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                  <Calendar size={20} className="text-primary" />
                  Horario de Atención
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Defina el rango de horas que aparecerá disponible en la agenda.
              </p>
              
              <div className="flex flex-wrap items-end gap-4 bg-slate-50 dark:bg-slate-700/30 p-5 rounded-xl border border-slate-100 dark:border-slate-600">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hora Apertura (24h)</label>
                      <div className="flex items-center gap-2">
                          <input 
                              type="number" 
                              min="0" max="23"
                              value={startHour}
                              onChange={(e) => setStartHour(parseInt(e.target.value))}
                              className="w-20 p-2.5 text-center border border-slate-300 dark:border-slate-600 rounded-lg text-base font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400 outline-none"
                          />
                          <span className="text-sm font-medium text-slate-400">:00</span>
                      </div>
                  </div>
                  
                  <div className="pb-3 text-slate-400 font-bold hidden sm:block">-</div>
                  
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hora Cierre (24h)</label>
                      <div className="flex items-center gap-2">
                          <input 
                              type="number" 
                              min="0" max="23"
                              value={endHour}
                              onChange={(e) => setEndHour(parseInt(e.target.value))}
                              className="w-20 p-2.5 text-center border border-slate-300 dark:border-slate-600 rounded-lg text-base font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-400 outline-none"
                          />
                          <span className="text-sm font-medium text-slate-400">:00</span>
                      </div>
                  </div>

                  <button 
                      onClick={handleSaveSchedule}
                      className="ml-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
                  >
                      Guardar Cambios
                  </button>
              </div>
          </div>
      )}

      {/* 3. System Data Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Database size={20} className="text-primary" />
                Administrar Motivos y Precios
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configure los motivos de consulta frecuentes y sus costos base.
            </p>
          </div>

          {(user.role === UserRole.PRINCIPAL || user.role === UserRole.DOCTOR) ? (
            <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${isProceduresOpen ? 'border-primary shadow-md bg-slate-50 dark:bg-slate-700/30' : 'border-slate-200 dark:border-slate-600'}`}>
                <button 
                    onClick={() => setIsProceduresOpen(!isProceduresOpen)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Tag size={18} className="text-slate-500 dark:text-slate-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Motivos de Consulta & Precios</span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">{procedures.length} items</span>
                    </div>
                    {isProceduresOpen ? <ChevronUp size={20} className="text-primary" /> : <ChevronDown size={20} className="text-slate-400" />}
                </button>
                
                {isProceduresOpen && (
                    <div className="p-5 border-t border-slate-200 dark:border-slate-700 animate-slide-down">
                        {/* List */}
                        <div className="flex-1 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-2 space-y-1 mb-4">
                            {procedures.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 dark:border-slate-700 group hover:border-red-200 dark:hover:border-red-900/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-white">{p.name}</div>
                                        <div className="text-xs text-slate-500">Costo Base: Bs {p.price}</div>
                                    </div>
                                    <button onClick={() => handleDeleteProcedure(p.id)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-red-500 rounded transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {/* Add Form */}
                        <form onSubmit={handleAddProcedure} className="flex gap-2">
                            <input 
                                placeholder="Nuevo Motivo / Tratamiento" 
                                value={newProcName} 
                                onChange={e => setNewProcName(e.target.value)}
                                className="flex-1 text-sm p-3 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-primary outline-none"
                            />
                            <input 
                                type="number"
                                placeholder="Precio" 
                                value={newProcPrice} 
                                onChange={e => setNewProcPrice(e.target.value)}
                                className="w-28 text-sm p-3 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-primary outline-none"
                            />
                            <button type="submit" disabled={!newProcName || !newProcPrice} className="bg-slate-900 dark:bg-primary text-white p-3 rounded-lg disabled:opacity-50 hover:opacity-90">
                                <Plus size={20} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-700/20 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center text-slate-500 text-sm">
                <Lock size={20} className="mx-auto mb-2 opacity-50" />
                Solo Doctores y Administradores pueden editar los precios y datos del sistema.
            </div>
          )}
      </div>

      {/* 4. User Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              Administración de Usuarios
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gestione los perfiles que tienen acceso a la plataforma.
            </p>
          </div>
          
          {user.role === UserRole.PRINCIPAL && (
             <button 
               onClick={() => handleOpenModal()}
               className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
             >
               <Plus size={16} />
               Añadir Usuario
             </button>
          )}
        </div>

        {user.role !== UserRole.PRINCIPAL ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
             <Lock size={20} />
             <p className="text-sm font-medium">Solo el Usuario Principal puede gestionar el personal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Cards */}
            {users.map((u) => (
              <div key={u.id} className="relative group bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 border border-slate-200 dark:border-slate-600 hover:border-primary dark:hover:border-primary transition-all">
                 <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {u.name.charAt(0)}
                       </div>
                       <div>
                          <h4 className="font-semibold text-slate-800 dark:text-white text-sm">{u.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            u.role === UserRole.PRINCIPAL 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
                              : u.role === UserRole.DOCTOR
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
                          }`}>
                            {u.role === UserRole.PRINCIPAL ? 'Principal' : u.role === UserRole.DOCTOR ? 'Doctor' : 'Staff'}
                          </span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                       <Clock size={14} />
                       <span>Último acceso:</span>
                       <span className="font-medium text-slate-700 dark:text-slate-300">
                         {new Date(u.lastAccess).toLocaleDateString()} {new Date(u.lastAccess).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                       <UserIcon size={14} />
                       <span>Usuario: {u.username}</span>
                    </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(u)}
                      className="p-1.5 bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-lg shadow-sm hover:text-primary hover:bg-slate-50 border border-slate-200 dark:border-slate-500"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    {u.id !== user.id && ( // Can't delete yourself
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 bg-white dark:bg-slate-600 text-red-500 dark:text-red-400 rounded-lg shadow-sm hover:bg-red-50 border border-slate-200 dark:border-slate-500"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                 </div>
              </div>
            ))}

            {/* Add User Card (Dashed) */}
            <button 
               onClick={() => handleOpenModal()}
               className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-400 hover:text-primary hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all min-h-[160px]"
            >
               <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">
                 <Plus size={24} />
               </div>
               <span className="font-medium text-sm">Añadir Nuevo Perfil</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Logo Configuration */}
      {(user.role === UserRole.PRINCIPAL || user.role === UserRole.DOCTOR) && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                          <ImageIcon size={20} className="text-primary" />
                          Personalización de Marca
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                          Cambie el logotipo que aparece en el inicio de sesión y en la barra lateral.
                      </p>
                      
                      <div className="flex gap-3">
                          <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              ref={fileInputRef} 
                              onChange={handleLogoUpload} 
                          />
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-slate-900 dark:bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
                          >
                              <Upload size={16} /> Subir Logo
                          </button>
                          {currentLogo && (
                              <button 
                                  onClick={handleRemoveLogo}
                                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                              >
                                  Restaurar Predeterminado
                              </button>
                          )}
                      </div>
                  </div>
                  
                  <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-w-[200px]">
                      <span className="text-xs text-slate-400 uppercase font-bold mb-2">Vista Previa</span>
                      {currentLogo ? (
                          <img src={currentLogo} alt="Logo Preview" className="h-16 object-contain" />
                      ) : (
                          <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                              <ImageIcon size={24} />
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* 6. DANGER ZONE */}
      {(user.role === UserRole.PRINCIPAL) && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm border border-red-100 dark:border-red-800 p-6">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
                  <AlertTriangle size={20} />
                  Zona de Peligro
              </h3>
              <p className="text-sm text-red-600/80 dark:text-red-300/70 mb-4">
                  Estas acciones son destructivas y no se pueden deshacer.
              </p>
              <button 
                  onClick={() => {
                      if(confirm('¿ESTÁ SEGURO? Esto borrará TODOS los datos, pacientes, citas y configuraciones, y restaurará el sistema al estado inicial de fábrica.')) {
                          db.resetDB();
                      }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow transition-all"
              >
                  Restablecer Base de Datos (Fábrica)
              </button>
          </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-700/50">
               <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                 {editingUser ? 'Editar Perfil' : 'Nuevo Usuario'}
               </h3>
               <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-red-500">
                 <X size={20} />
               </button>
             </div>
             
             <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                   <input 
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className={inputClass}
                      placeholder="Ej. Dr. Juan / Srta. Ana"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol / Permisos</label>
                   <select
                      value={formRole}
                      onChange={e => setFormRole(e.target.value as UserRole)}
                      className={inputClass}
                   >
                      <option value={UserRole.STAFF}>Staff (Secretaria/Asistente) - Acceso General</option>
                      <option value={UserRole.DOCTOR}>Doctor - Manejo de Pacientes & Configuración</option>
                      <option value={UserRole.PRINCIPAL}>Principal - Acceso Total (Admin)</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Usuario de Acceso</label>
                   <input 
                      required
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      className={inputClass}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                   <input 
                      type="password"
                      required
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••"
                   />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                   <button 
                      type="button" 
                      onClick={() => setShowUserModal(false)}
                      className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                   >
                      Cancelar
                   </button>
                   <button 
                      type="submit"
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-sm"
                   >
                      <Save size={16} />
                      Guardar
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
