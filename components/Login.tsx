
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    setCustomLogo(db.getLogo());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove leading/trailing whitespace based on user request
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    const user = db.login(cleanUsername, cleanPassword);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales inválidas.');
    }
  };

  // Updated: Modern Graphic "CT" Logo (Teal Gradient) - Consistent with Layout
  const CTLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo_grad_login" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" /> {/* Teal-400 */}
            <stop offset="100%" stopColor="#0f766e" /> {/* Teal-700 */}
        </linearGradient>
        <filter id="shadow_login" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15"/>
        </filter>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="100" height="100" rx="22" fill="white" />
      
      {/* Logo Group */}
      <g filter="url(#shadow_login)">
          {/* C Shape - Dynamic Curve */}
          <path 
            d="M 80 30 C 74 20 60 15 45 15 C 22 15 12 35 12 55 C 12 78 28 90 50 90 C 68 90 80 80 85 65" 
            stroke="url(#logo_grad_login)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            fill="none" 
          />
          {/* T Shape - Nested */}
          <path 
            d="M 42 38 H 82 M 62 38 V 75" 
            stroke="url(#logo_grad_login)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            fill="none" 
          />
      </g>
    </svg>
  );

  return (
    <div className="min-h-screen w-full flex bg-white font-sans">
      
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white z-10">
        <div className="w-full max-w-[380px] space-y-8">
            
            {/* Header - Branding */}
            <div className="flex flex-col items-center text-center">
               <div className="w-24 h-24 flex items-center justify-center mb-6 drop-shadow-xl bg-gradient-to-br from-primary to-teal-700 rounded-3xl p-3">
                  {customLogo ? (
                      <img src={customLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                      <CTLogo size={90} />
                  )}
               </div>
               
               <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Consultorio Odontológico Taboada</h2>
               <p className="text-slate-400 text-xs mt-2 font-semibold uppercase tracking-[0.2em]">Sistema de Gestión Clínica</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="Ingrese su usuario"
                    required
                  />
               </div>

               <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Contraseña</label>
                  </div>
                  <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                        placeholder="••••••••"
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
               </div>

               {error && (
                  <div className="text-red-500 text-xs bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                    <span className="font-bold">Error:</span> {error}
                  </div>
               )}

               <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-primary text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 mt-2"
               >
                  Iniciar Sesión
               </button>
            </form>

            {/* Footer */}
            <div className="pt-8 mt-8 border-t border-slate-100 text-center">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider border border-slate-200">
                    <ShieldCheck size={12} className="text-primary" />
                    Datos protegidos por jerarquía
                </div>
                <div className="space-y-2 text-xs text-slate-400">
                    <p>Gestión de usuarios restringida al administrador.</p>
                    <p className="font-medium text-slate-500">® 2025 Marca registrada TMG</p>
                </div>
            </div>

        </div>
      </div>

      {/* Right Side - Image Only (No Text) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-50 overflow-hidden">
        {/* Background Image - Clean */}
        <img 
          src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2068&auto=format&fit=crop" 
          alt="Dental Office" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Subtle overlay just for slight tint, no text */}
        <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
      </div>

    </div>
  );
};

export default Login;
