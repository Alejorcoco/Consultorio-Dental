

import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Patient, ToothCondition, ToothFace, OdontogramDetail } from '../types';
import { 
    AlertCircle, X, Check, Activity, PenTool, Columns, Disc, Zap, Diamond
} from 'lucide-react';

// --- VISUAL CONSTANTS ---
const COLORS = {
    healthy: 'fill-white dark:fill-slate-800',
    caries: 'fill-red-500',
    restoration_good: 'fill-blue-500',
    root_canal: 'fill-orange-500', // Trat. Conducto
    veneer: 'fill-cyan-400', // Carillas
    whitening: 'fill-yellow-200', // Blanqueamiento
    sealant: 'fill-emerald-400',
    missing: 'fill-slate-900 dark:fill-slate-900',
    bridge: 'fill-purple-500',
    implant: 'fill-gray-400' 
};

// --- HELPER COMPONENT: SINGLE TOOTH SVG ---
interface ToothProps {
    id: number;
    data: OdontogramDetail[];
    activeTool: ToothCondition | 'eraser';
    onUpdate: (id: number, face: ToothFace, condition: ToothCondition | 'eraser') => void;
}

const Tooth: React.FC<ToothProps> = ({ id, data, activeTool, onUpdate }) => {
    const getFaceCondition = (face: ToothFace): ToothCondition | undefined => {
        return data.find(d => d.toothNumber === id && d.face === face)?.condition;
    };

    const wholeCond = getFaceCondition('whole');
    const isMissing = wholeCond === 'missing';
    const isBridge = wholeCond === 'bridge';
    const isImplant = wholeCond === 'implant';

    const handleClick = (face: ToothFace) => {
        onUpdate(id, face, activeTool);
    };

    const getColorClass = (face: ToothFace) => {
        const cond = getFaceCondition(face);
        if (!cond) return 'fill-white dark:fill-slate-700 hover:fill-slate-100 dark:hover:fill-slate-600';
        return COLORS[cond] || 'fill-white';
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-14 h-14 md:w-16 md:h-16 transition-transform hover:scale-110 duration-200">
                {isMissing ? (
                    <div className="w-full h-full relative cursor-pointer" onClick={() => handleClick('whole')}>
                         <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                             <rect width="100" height="100" className="fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" />
                             <line x1="0" y1="0" x2="100" y2="100" stroke="black" strokeWidth="8" />
                             <line x1="100" y1="0" x2="0" y2="100" stroke="black" strokeWidth="8" />
                         </svg>
                    </div>
                ) : isBridge ? (
                    <div className="w-full h-full relative cursor-pointer" onClick={() => handleClick('whole')}>
                         <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                             <rect width="100" height="100" rx="15" className="fill-purple-100 dark:fill-purple-900/50 stroke-purple-600 stroke-[4px]" />
                             <text x="50" y="65" textAnchor="middle" className="text-4xl font-bold fill-purple-600 pointer-events-none">P</text>
                         </svg>
                    </div>
                ) : isImplant ? (
                    <div className="w-full h-full relative cursor-pointer" onClick={() => handleClick('whole')}>
                         <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                             <rect width="100" height="100" rx="5" className="fill-gray-100 dark:fill-gray-800 stroke-gray-500 stroke-[4px]" />
                             <circle cx="50" cy="50" r="15" className="fill-gray-400" />
                             <rect x="45" y="65" width="10" height="30" className="fill-gray-500" />
                         </svg>
                    </div>
                ) : (
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                        <polygon points="0,0 100,0 75,25 25,25" className={`stroke-slate-300 dark:stroke-slate-600 stroke-[1px] cursor-pointer transition-colors ${getColorClass('top')}`} onClick={() => handleClick('top')} />
                        <polygon points="0,100 100,100 75,75 25,75" className={`stroke-slate-300 dark:stroke-slate-600 stroke-[1px] cursor-pointer transition-colors ${getColorClass('bottom')}`} onClick={() => handleClick('bottom')} />
                        <polygon points="0,0 0,100 25,75 25,25" className={`stroke-slate-300 dark:stroke-slate-600 stroke-[1px] cursor-pointer transition-colors ${getColorClass('left')}`} onClick={() => handleClick('left')} />
                        <polygon points="100,0 100,100 75,75 75,25" className={`stroke-slate-300 dark:stroke-slate-600 stroke-[1px] cursor-pointer transition-colors ${getColorClass('right')}`} onClick={() => handleClick('right')} />
                        <rect x="25" y="25" width="50" height="50" className={`stroke-slate-300 dark:stroke-slate-600 stroke-[1px] cursor-pointer transition-colors ${getColorClass('center')}`} onClick={() => handleClick('center')} />
                    </svg>
                )}
            </div>
            <span className="text-xs font-bold text-slate-500 mt-1">{id}</span>
        </div>
    );
};

// --- MAIN MODULE ---
interface OdontogramProps {
    embeddedPatient?: Patient | null;
    externalDentitionType?: 'adult' | 'child';
    currentDetails: OdontogramDetail[];
    onDetailsChange: (details: OdontogramDetail[]) => void;
}

const Odontogram: React.FC<OdontogramProps> = ({ embeddedPatient, externalDentitionType = 'adult', currentDetails, onDetailsChange }) => {
  const [activeTool, setActiveTool] = useState<ToothCondition | 'eraser'>('caries');
  const [initialLoadedDetails, setInitialLoadedDetails] = useState<OdontogramDetail[]>([]);

  // Load initial state to track what was already saved (for protection logic)
  useEffect(() => {
      if (embeddedPatient) {
          const record = db.getOdontogram(embeddedPatient.id);
          if (record) {
              setInitialLoadedDetails(record.details);
          } else {
              setInitialLoadedDetails([]);
          }
      }
  }, [embeddedPatient]);

  const handleUpdateTooth = (id: number, face: ToothFace, tool: ToothCondition | 'eraser') => {
      // 1. Protection Logic: Check if we are modifying a tooth that had data loaded from DB
      const existingEntry = initialLoadedDetails.find(d => d.toothNumber === id);
      
      // If it has history, and we haven't already confirmed modification for this tooth in this session (simplified logic: just ask if history exists)
      if (existingEntry && tool !== 'eraser') { // Ask before overwriting valid data
          const targetFaceHasData = existingEntry.face === 'whole' || existingEntry.face === face;
          
          // Only ask if we are actually changing something that exists
          const isSame = currentDetails.find(d => d.toothNumber === id && d.face === face && d.condition === tool);
          if (isSame) return; // No change

          if (targetFaceHasData) {
             const confirmChange = window.confirm(`La pieza ${id} ya tiene un registro guardado (${existingEntry.condition}). ¿Desea modificarlo?`);
             if (!confirmChange) return;
          }
      }

      // 2. State Update
      const newDetails = [...currentDetails];
      
      // Filter out what needs to be removed based on the action
      // If setting 'whole' condition (bridge, implant, missing), remove ALL other entries for this tooth
      if (tool === 'missing' || tool === 'bridge' || tool === 'implant') {
          const filtered = newDetails.filter(d => d.toothNumber !== id);
          filtered.push({ toothNumber: id, face: 'whole', condition: tool, notes: tool.charAt(0).toUpperCase() + tool.slice(1) });
          onDetailsChange(filtered);
          return;
      }

      // If tool is Eraser
      if (tool === 'eraser') {
          if (face === 'whole') {
              // Erase everything for this tooth
              onDetailsChange(newDetails.filter(d => d.toothNumber !== id));
          } else {
              // Erase specific face. Also check if there was a 'whole' condition, that gets removed too.
              onDetailsChange(newDetails.filter(d => !(d.toothNumber === id && (d.face === face || d.face === 'whole'))));
          }
          return;
      }

      // Normal Condition Application (Caries, Resin, etc.)
      // Remove any existing entry for this specific face
      // Also remove any 'whole' entry for this tooth as we are painting a specific face
      const filtered = newDetails.filter(d => !(d.toothNumber === id && (d.face === face || d.face === 'whole')));
      
      filtered.push({ toothNumber: id, face, condition: tool, notes: '' });
      onDetailsChange(filtered);
  };

  const renderQuadrant = (toothIds: number[]) => (
    <div className="flex gap-1 md:gap-2">
      {toothIds.map(id => (
        <Tooth 
          key={id} 
          id={id} 
          data={currentDetails} 
          activeTool={activeTool} 
          onUpdate={handleUpdateTooth} 
        />
      ))}
    </div>
  );

  // --- TOOLS DEFINITION (Ordered Grid) ---
  const tools = [
      { id: 'caries', label: 'Caries', icon: <AlertCircle size={18} />, colorClass: 'bg-red-500 text-white', ringClass: 'ring-red-500' },
      { id: 'restoration_good', label: 'Rest. OK', icon: <Check size={18} />, colorClass: 'bg-blue-500 text-white', ringClass: 'ring-blue-500' },
      { id: 'root_canal', label: 'Trat. Cond.', icon: <Activity size={18} />, colorClass: 'bg-orange-500 text-white', ringClass: 'ring-orange-500' },
      { id: 'veneer', label: 'Carillas', icon: <Diamond size={18} />, colorClass: 'bg-cyan-400 text-white', ringClass: 'ring-cyan-400' },
      { id: 'whitening', label: 'Blanquear', icon: <Zap size={18} />, colorClass: 'bg-yellow-200 text-yellow-800', ringClass: 'ring-yellow-300' },
      { id: 'missing', label: 'Ausente', icon: <X size={18} />, colorClass: 'bg-slate-800 text-white', ringClass: 'ring-slate-800' },
      { id: 'bridge', label: 'Puente', icon: <Columns size={18} />, colorClass: 'bg-purple-600 text-white', ringClass: 'ring-purple-600' },
      { id: 'implant', label: 'Implante', icon: <Disc size={18} />, colorClass: 'bg-gray-500 text-white', ringClass: 'ring-gray-500' },
      { id: 'eraser', label: 'Borrador', icon: <PenTool size={18} />, colorClass: 'bg-slate-200 text-slate-700', ringClass: 'ring-slate-400' },
  ];

  return (
    <div className="flex flex-col animate-fade-in h-full bg-white dark:bg-slate-900">
        
        {/* Controls */}
        <div className="flex flex-col items-end gap-4 mb-2 p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
            <div className="flex flex-wrap justify-end gap-2 w-full">
                {tools.map(tool => (
                    <button 
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as any)} 
                        title={tool.label}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm border ${
                            activeTool === tool.id 
                            ? `${tool.colorClass} border-transparent ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-800 ${tool.ringClass}` 
                            : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {tool.icon}
                        <span className="hidden xl:inline">{tool.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto">
            <div className="flex-grow bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 relative p-8 flex items-center justify-center min-h-[400px]">
                <div className={`flex flex-col items-center justify-center w-full min-w-[700px] gap-12 transform scale-100`}>
                    {externalDentitionType === 'adult' ? (
                        <>
                            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 pb-8 border-b-2 border-dashed border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="flex justify-end">{renderQuadrant([18,17,16,15,14,13,12,11])}</div>
                                <div className="flex justify-start">{renderQuadrant([21,22,23,24,25,26,27,28])}</div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 pt-4 w-full">
                                <div className="flex justify-end">{renderQuadrant([48,47,46,45,44,43,42,41])}</div>
                                <div className="flex justify-start">{renderQuadrant([31,32,33,34,35,36,37,38])}</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 pb-8 border-b-2 border-dashed border-slate-200 dark:border-slate-700/50 mt-4 w-full">
                                <div className="flex justify-end">{renderQuadrant([55,54,53,52,51])}</div>
                                <div className="flex justify-start">{renderQuadrant([61,62,63,64,65])}</div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 pt-4 w-full">
                                <div className="flex justify-end">{renderQuadrant([85,84,83,82,81])}</div>
                                <div className="flex justify-start">{renderQuadrant([71,72,73,74,75])}</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Odontogram;
