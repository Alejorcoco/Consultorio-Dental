
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Patient, Treatment, OdontogramRecord, MedicalImage } from '../types';
import { X, FileText, Calendar, Activity, Printer, Grid, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';

interface ClinicalHistoryModalProps {
  patient: Patient;
  onClose: () => void;
}

const ClinicalHistoryModal: React.FC<ClinicalHistoryModalProps> = ({ patient, onClose }) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [odontogram, setOdontogram] = useState<OdontogramRecord | undefined>(undefined);
  const [images, setImages] = useState<MedicalImage[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTreatments(db.getTreatmentsByPatient(patient.id));
    setOdontogram(db.getOdontogram(patient.id));
    setImages(db.getImagesByPatient(patient.id)); // Load Images
    setLogo(db.getLogo());
  }, [patient.id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
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
                          patientId: patient.id,
                          date: new Date().toISOString(),
                          type: 'Rayos X',
                          title: file.name,
                          imageData: base64
                      };
                      
                      db.addImage(newImg);
                      setImages(prev => [newImg, ...prev]);
                  }
              };
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteImage = (id: string) => {
      if(confirm('¿Eliminar esta imagen del expediente?')) {
          db.deleteImage(id);
          setImages(prev => prev.filter(img => img.id !== id));
      }
  };

  const handlePrint = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      const clinicLogo = logo ? `<img src="${logo}" style="height: 60px; max-width: 180px; object-fit: contain; display: block;" />` : `<h1 style="color: #0f172a; font-size: 24px; font-weight: bold; margin: 0;">Consultorio Odontológico Taboada</h1>`;

      // Generate Odontogram Table Rows
      let odontogramRows = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; font-style: italic; padding: 10px;">Sin registro de odontograma.</td></tr>';
      
      if (odontogram && odontogram.details.length > 0) {
          odontogramRows = odontogram.details.map(d => {
              const conditionLabel = d.condition === 'restoration_good' ? 'Restauración (Buen Estado)' :
                                     d.condition === 'root_canal' ? 'Tratamiento de Conducto' :
                                     d.condition === 'veneer' ? 'Carilla' :
                                     d.condition === 'whitening' ? 'Blanqueamiento' :
                                     d.condition === 'missing' ? 'Pieza Ausente' : 
                                     d.condition.charAt(0).toUpperCase() + d.condition.slice(1);
              
              const faceLabel = d.face === 'whole' ? 'Completa' : 
                                d.face === 'top' ? 'Vestibular (Sup)' :
                                d.face === 'bottom' ? 'Palatino/Lingual' :
                                d.face === 'left' ? 'Mesial/Distal' :
                                d.face === 'right' ? 'Distal/Mesial' : 'Oclusal/Incisal';

              return `
                <tr>
                    <td style="text-align: center; font-weight: bold;">${d.toothNumber}</td>
                    <td>${faceLabel} - ${conditionLabel}</td>
                    <td>${d.notes || '-'}</td>
                </tr>
              `;
          }).join('');
      }

      // Generate Images Grid for PDF
      let imagesHtml = '';
      if (images.length > 0) {
          imagesHtml = `
            <h3 style="margin-top: 30px;">Estudios de Imagenología</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;">
                ${images.map(img => `
                    <div style="width: 150px; border: 1px solid #e2e8f0; border-radius: 5px; padding: 5px; text-align: center;">
                        <img src="${img.imageData}" style="width: 100%; height: 120px; object-fit: contain; display: block;" />
                        <p style="font-size: 9px; margin: 5px 0 0 0; color: #475569;">${img.title}</p>
                        <p style="font-size: 8px; margin: 0; color: #94a3b8;">${new Date(img.date).toLocaleDateString()}</p>
                    </div>
                `).join('')}
            </div>
          `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Historia Clínica - ${patient.firstName} ${patient.lastName}</title>
          <style>
            @media print {
                @page { size: A4; margin: 15mm; }
                body { -webkit-print-color-adjust: exact; }
            }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; margin: 0; font-size: 12px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 25px; }
            .clinic-info { text-align: right; font-size: 11px; color: #64748b; }
            
            .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
            .row { display: flex; gap: 20px; margin-bottom: 10px; }
            .col { flex: 1; }
            .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 3px; display: block; letter-spacing: 0.5px; }
            .value { font-size: 13px; font-weight: 600; color: #0f172a; }
            .alert { color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px; }
            
            h3 { font-size: 14px; margin: 25px 0 10px 0; color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { text-align: left; background: #f1f5f9; font-size: 10px; text-transform: uppercase; color: #475569; padding: 8px; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            tr:nth-child(even) { background-color: #fcfcfc; }
            
            .status-completed { color: #059669; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 10px; }
            
            .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; background: white; }
            
            .signature-box { margin-top: 50px; page-break-inside: avoid; display: flex; justify-content: flex-end; }
            .signature-line { width: 200px; border-top: 1px solid #333; text-align: center; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>${clinicLogo}</div>
            <div class="clinic-info">
              <p style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 5px;">Odontología Integral Especializada</p>
              <p>Fecha de Impresión: ${new Date().toLocaleDateString()}</p>
              <p>Historia Clínica Digital # ${patient.id.substring(0, 6).toUpperCase()}</p>
            </div>
          </div>

          <div class="patient-card">
             <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: baseline;">
                <div>
                    <span class="label">Paciente</span>
                    <span class="value" style="font-size: 18px;">${patient.firstName} ${patient.lastName}</span>
                </div>
                <div>
                     <span class="label" style="text-align: right;">CI / DNI</span>
                     <span class="value">${patient.dni || '---'}</span>
                </div>
             </div>
             
             <div class="row">
                <div class="col">
                   <span class="label">Edad / Nacimiento / Sexo</span>
                   <span class="value">${patient.age ? patient.age + ' años' : '--'} / ${patient.birthDate || '--'} / ${patient.gender || '--'}</span>
                </div>
                <div class="col">
                   <span class="label">Celular</span>
                   <span class="value">${patient.phone || '---'}</span>
                </div>
                <div class="col">
                   <span class="label">Ocupación</span>
                   <span class="value">${patient.occupation || '---'}</span>
                </div>
             </div>
             
             <div class="row" style="margin-top: 15px;">
                <div class="col">
                   <span class="label">Alergias</span>
                   <span class="value ${patient.allergies && patient.allergies !== 'Ninguna' ? 'alert' : ''}">${patient.allergies || 'Ninguna'}</span>
                </div>
                <div class="col" style="flex: 2;">
                   <span class="label">Antecedentes Patológicos</span>
                   <span class="value" style="line-height: 1.4;">${patient.medicalHistory && patient.medicalHistory.length > 0 ? patient.medicalHistory.join(', ') : 'Sin antecedentes registrados'}</span>
                </div>
             </div>
          </div>

          <h3>Estado Dental Actual (Odontograma)</h3>
          ${odontogram ? `
            <p style="font-size: 10px; color: #64748b; margin-bottom: 5px;">Última actualización: ${new Date(odontogram.updatedAt).toLocaleDateString()}</p>
            <table>
                <thead>
                    <tr>
                        <th width="10%">Pieza</th>
                        <th width="40%">Condición</th>
                        <th width="50%">Notas</th>
                    </tr>
                </thead>
                <tbody>
                    ${odontogramRows}
                </tbody>
            </table>
          ` : '<p style="font-style: italic; color: #64748b; padding: 10px 0;">No se ha registrado odontograma para este paciente.</p>'}

          <h3>Tratamientos Realizados (Evolución)</h3>
          
          <table>
             <thead>
                <tr>
                   <th width="12%">Fecha</th>
                   <th width="25%">Procedimiento</th>
                   <th width="40%">Detalle Clínico</th>
                   <th width="13%">Estado</th>
                </tr>
             </thead>
             <tbody>
                ${treatments.length > 0 ? treatments.map(t => `
                  <tr>
                     <td>${new Date(t.date).toLocaleDateString()}</td>
                     <td><strong>${t.procedure}</strong></td>
                     <td>${t.description}</td>
                     <td><span class="${t.status === 'Completado' ? 'status-completed' : ''}">${t.status}</span></td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">No hay tratamientos registrados.</td></tr>'}
             </tbody>
          </table>

          ${imagesHtml}

          <div class="signature-box">
             <div class="signature-line">
                 <strong>Dr. Taboada</strong><br>
                 <span style="font-size: 10px; color: #64748b;">Cirujano Dentista - Director</span>
             </div>
          </div>

          <div class="footer">
             Documento generado digitalmente por sistema DentalFlow TMG | Confidencial
          </div>
        </body>
        </html>
      `;

      // Clear previous content
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Ensure content is loaded
      const img = doc.querySelector('img');
      if (img) {
          img.onload = () => {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
          };
          setTimeout(() => {
             if (!iframe.contentWindow?.matchMedia('print').matches) { 
                 iframe.contentWindow?.print(); 
             }
          }, 1000);
      } else {
          setTimeout(() => {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
          }, 300);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Hidden Iframe for Printing */}
        <iframe 
            ref={iframeRef} 
            style={{ position: 'absolute', width: '0', height: '0', border: 'none' }} 
            title="print-frame" 
        />
        
        {/* Hidden Input for Upload */}
        <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageUpload}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
             <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-lg text-blue-600 dark:text-blue-400">
               <FileText size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-800 dark:text-white">Expediente Digital</h2>
               <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confidencial</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40 rounded-lg transition-colors text-sm font-bold shadow-sm" 
                title="Imprimir Informe (A4)"
            >
               <Printer size={18} /> Imprimir Reporte
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10">
            
            {/* Patient Header Summary */}
            <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6 items-start">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-500 dark:text-slate-300 overflow-hidden">
                        {patient.photo ? <img src={patient.photo} className="w-full h-full object-cover" /> : <>{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</>}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{patient.firstName} {patient.lastName}</h3>
                        <p className="text-sm text-slate-500">CI: {patient.dni}</p>
                    </div>
                </div>
                
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Edad</span>
                        <span className="font-bold text-slate-700 dark:text-white text-lg">{patient.age ? patient.age + ' años' : '-'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Celular</span>
                        <span className="font-bold text-slate-700 dark:text-white text-lg">{patient.phone || '-'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg col-span-2 border border-slate-100 dark:border-slate-600">
                        <span className="block text-xs text-slate-400 uppercase font-bold mb-1">Alergias</span>
                        <span className={`font-bold text-lg ${patient.allergies && patient.allergies !== 'Ninguna' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-white'}`}>
                            {patient.allergies || 'Ninguna'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8 pb-10">
                
                {/* 1. ODONTOGRAM SUMMARY */}
                <div>
                    <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-white font-bold border-b border-slate-200 dark:border-slate-700 pb-2">
                        <Grid size={20} className="text-indigo-500" />
                        <h3>Estado Dental Actual (Odontograma)</h3>
                    </div>
                    
                    {odontogram && odontogram.details.length > 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-4 py-3">Pieza</th>
                                        <th className="px-4 py-3">Ubicación</th>
                                        <th className="px-4 py-3">Condición</th>
                                        <th className="px-4 py-3">Notas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                                    {odontogram.details.map((d, i) => {
                                        const conditionMap: any = {
                                            'healthy': 'Sano', 'caries': 'Caries', 'restoration_good': 'Restauración OK',
                                            'root_canal': 'Trat. Conducto', 'veneer': 'Carilla', 'whitening': 'Blanqueamiento',
                                            'missing': 'Ausente', 'sealant': 'Sellante', 'bridge': 'Puente', 'implant': 'Implante'
                                        };
                                        const faceMap: any = {
                                            'whole': 'Completa', 'center': 'Oclusal/Incisal', 'top': 'Vestibular', 'bottom': 'Palatino', 'left': 'Mesial', 'right': 'Distal'
                                        };
                                        return (
                                            <tr key={i}>
                                                <td className="px-4 py-2 font-bold">{d.toothNumber}</td>
                                                <td className="px-4 py-2">{faceMap[d.face]}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                                        ${d.condition === 'caries' ? 'bg-red-100 text-red-700' : 
                                                          d.condition === 'root_canal' ? 'bg-amber-100 text-amber-700' :
                                                          d.condition === 'missing' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {conditionMap[d.condition] || d.condition}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 italic text-slate-500">{d.notes || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg text-slate-400 text-sm italic text-center border border-dashed border-slate-200 dark:border-slate-700">
                            No se ha registrado un odontograma para este paciente.
                        </div>
                    )}
                </div>

                {/* 2. TREATMENTS HISTORY */}
                <div>
                    <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-white font-bold border-b border-slate-200 dark:border-slate-700 pb-2">
                        <Activity size={20} className="text-primary" />
                        <h3>Tratamientos Realizados (Evolución)</h3>
                    </div>

                    <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 space-y-8">
                        {treatments.length > 0 ? treatments.map((t, idx) => (
                            <div key={t.id} className="relative pl-8">
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-800 ${t.status === 'Completado' ? 'bg-primary' : 'bg-amber-400'}`}></div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                    <span className="text-lg font-bold text-slate-800 dark:text-white">{t.procedure}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                        <Calendar size={12} /> {new Date(t.date).toLocaleDateString()}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                                        t.status === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {t.status}
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-sm text-slate-600 dark:text-slate-300">
                                    <p className="mb-2 font-medium">{t.description}</p>
                                    <p className="text-xs font-mono text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">Costo: Bs {t.cost} | Registrado por: Dr. Taboada</p>
                                </div>
                            </div>
                        )) : (
                            <div className="pl-8 pt-2 text-slate-400 italic">No hay tratamientos registrados aún.</div>
                        )}
                        
                        {/* Initial Registration Marker */}
                        <div className="relative pl-8">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border-4 border-white dark:border-slate-800"></div>
                            <span className="text-sm font-bold text-slate-400">Fecha de Registro</span>
                            <p className="text-xs text-slate-400">{new Date(patient.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* 3. IMAGING HISTORY */}
                <div>
                    <div className="mb-4 flex items-center justify-between text-slate-800 dark:text-white font-bold border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-2">
                            <ImageIcon size={20} className="text-amber-500" />
                            <h3>Estudios de Imagenología</h3>
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs transition-colors border border-amber-200"
                        >
                            <Upload size={14} /> Subir Imagen
                        </button>
                    </div>
                    {images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {images.map(img => (
                                <div key={img.id} className="relative group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <div className="aspect-square bg-slate-100 dark:bg-slate-700">
                                        <img src={img.imageData} alt={img.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{img.title}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(img.date).toLocaleDateString()}</p>
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
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm">
                            No hay estudios cargados (Rayos X, Fotos).
                        </div>
                    )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalHistoryModal;
