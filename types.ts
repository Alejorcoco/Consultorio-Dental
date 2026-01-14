
export enum UserRole {
  PRINCIPAL = 'PRINCIPAL', // Dueño / Admin Total
  DOCTOR = 'DOCTOR',       // Odontólogo (Configura sus precios/datos)
  STAFF = 'STAFF'          // Secretaria / Asistente
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string; // Optional for security in frontend usually, but needed for mock
  lastAccess: string; // ISO Date
}

export interface ClinicSchedule {
    startHour: number; // e.g. 8 for 08:00
    endHour: number;   // e.g. 18 for 18:00
}

export interface Reminder {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  createdBy: string; // New field
  createdById: string; // New field
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string; // e.g. 500mg
  frequency: string; // e.g. Cada 8 horas
  duration: string; // e.g. Por 5 días
  notes?: string;
}

export interface DiagnosticSession {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string; // ISO
  cie10Code?: string; // Código principal
  cie10Name?: string;
  evolutionNotes: string; // Nota clínica
  prescription: PrescriptionItem[];
  odontogramSnapshot?: OdontogramDetail[]; // Snapshot del estado en ese momento
  nextVisitPlan?: string[]; // New field: List of next steps
}

export interface ProcedureItem {
  id: string;
  name: string;
  price: number;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dni: string; // Carnet de identidad (CI)
  email?: string;
  phone?: string;
  photo?: string; // New Field: Base64 Image string
  allergies: string; // Stored as comma separated string for simplicity, or we can parse it
  generalDescription: string;
  medicalHistory: string[]; // Antecedentes (Cardio, etc.)
  currentMedications?: Medication[]; // New Field
  // New fields
  age?: string;
  birthDate?: string; // New Field: YYYY-MM-DD
  weight?: string;
  height?: string;
  createdAt: string;
  // Extended Demographic Data
  gender?: 'Masculino' | 'Femenino' | 'Otro';
  civilStatus?: 'Soltero/a' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Unión Libre';
  occupation?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // ISO String
  type: 'Consulta' | 'Tratamiento' | 'Revisión' | 'Emergencia';
  status: 'Pendiente' | 'Completada' | 'Cancelada';
  notes?: string;
  // Financial link
  price?: number; // Agreed price for the procedure
  isPaid?: boolean; // If paid in advance
  relatedPaymentId?: string;
}

// --- NEW MODULES ---

export type TreatmentStatus = 'Planificado' | 'En Proceso' | 'Completado';

export interface Treatment {
  id: string;
  patientId: string;
  patientName: string; // Denormalized for easier display
  procedure: string; // e.g., "Endodoncia", "Limpieza"
  description: string;
  diagnosis?: string; // CIE-10 Code + Name
  cost: number;
  status: TreatmentStatus;
  date: string;
}

export type PaymentMethod = 'Efectivo' | 'QR' | 'Tarjeta' | 'Transferencia';

export interface Payment {
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  notes?: string;
  relatedProcedure?: string; // Specific concept paid for
  status: 'completed' | 'cancelled'; // Added status field
}

export interface DashboardStats {
  totalIncome: number;
  totalPatients: number;
  appointmentsToday: number;
  pendingAppointments: number;
}

// --- ODONTOGRAM MODULE ---
// Updated: replaced restoration_bad with root_canal, added veneer, whitening
export type ToothCondition = 'healthy' | 'caries' | 'restoration_good' | 'root_canal' | 'veneer' | 'whitening' | 'missing' | 'sealant' | 'bridge' | 'implant';
export type ToothFace = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'whole';

export interface OdontogramDetail {
    toothNumber: number;
    face: ToothFace;
    condition: ToothCondition;
    notes?: string;
}

export interface OdontogramRecord {
    id: string;
    patientId: string;
    updatedAt: string;
    details: OdontogramDetail[];
}

// --- IMAGING MODULE ---
export type ImageType = 'Rayos X' | 'Tomografía' | 'Foto Clínica' | 'Laboratorio' | 'Otro';

export interface MedicalImage {
    id: string;
    patientId: string;
    date: string;
    type: ImageType;
    title: string;
    imageData: string; // Base64 encoded image
    notes?: string;
}
