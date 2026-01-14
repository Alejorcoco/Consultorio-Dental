
import { 
  User, Patient, Appointment, Payment, Treatment, OdontogramRecord, 
  Reminder, ProcedureItem, UserRole, DashboardStats, DiagnosticSession, ClinicSchedule, MedicalImage 
} from '../types';

class DBService {
  private users: User[] = [];
  private patients: Patient[] = [];
  private appointments: Appointment[] = [];
  private payments: Payment[] = [];
  private treatments: Treatment[] = [];
  private odontograms: OdontogramRecord[] = [];
  private reminders: Reminder[] = [];
  private procedures: ProcedureItem[] = []; 
  private diagnosticSessions: DiagnosticSession[] = []; 
  private medicalImages: MedicalImage[] = []; // New
  private financialGoal: number = 20000;
  private logo: string | null = null;
  private schedule: ClinicSchedule = { startHour: 8, endHour: 18 };

  constructor() {
    this.load();
    // Seed if empty
    if (this.users.length === 0) {
      this.seedData();
    }
  }

  // --- SYSTEM RESET ---
  resetDB() {
      localStorage.clear();
      this.users = [];
      this.patients = [];
      this.appointments = [];
      this.payments = [];
      this.treatments = [];
      this.odontograms = [];
      this.reminders = [];
      this.procedures = [];
      this.diagnosticSessions = [];
      this.medicalImages = [];
      this.schedule = { startHour: 8, endHour: 18 };
      this.logo = null;
      
      this.seedData();
      // Force reload to apply clean state
      window.location.reload();
  }

  private seedData() {
      // 1. Usuarios por defecto (Admin solicitado)
      this.users = [
        { id: '1', username: 'admin', name: 'Dr. Taboada', role: UserRole.PRINCIPAL, password: 'admin', lastAccess: new Date().toISOString() },
        { id: '2', username: 'sec', name: 'Secretaria', role: UserRole.STAFF, password: '123', lastAccess: new Date().toISOString() }
      ];

      // 2. Procedimientos y Motivos UNIFICADOS
      this.procedures = [
        { id: '1', name: 'Consulta General', price: 100 },
        { id: '2', name: 'Dolor Agudo (Emergencia)', price: 150 },
        { id: '3', name: 'Limpieza Dental', price: 250 },
        { id: '4', name: 'Resina Simple', price: 300 },
        { id: '5', name: 'Endodoncia', price: 800 },
        { id: '6', name: 'Extracción Simple', price: 200 },
        { id: '7', name: 'Blanqueamiento', price: 1200 },
        { id: '8', name: 'Ortodoncia Mensual', price: 350 },
        { id: '9', name: 'Valoración Estética', price: 0 }, 
      ];

      // 3. Generar Pacientes de prueba (Base)
      const names = [
          ['Juan', 'Pérez'], ['María', 'González'], ['Carlos', 'Rodríguez'], ['Ana', 'López'], 
          ['Pedro', 'Martínez'], ['Laura', 'Sánchez'], ['Diego', 'Fernández'], ['Sofía', 'Ramírez'],
          ['Miguel', 'Torres'], ['Lucía', 'Vargas'], ['Andrés', 'Castro'], ['Elena', 'Romero'],
          ['Gabriel', 'Suárez'], ['Valentina', 'Mendoza']
      ];

      const now = new Date();

      names.forEach((name, index) => {
          const id = (index + 100).toString();
          const createdAt = new Date(now.getTime() - Math.random() * 10000000000).toISOString();
          
          this.patients.push({
              id,
              firstName: name[0],
              lastName: name[1],
              dni: `${1000000 + index} LP`,
              phone: `700${10000 + index}`,
              email: `${name[0].toLowerCase()}.${name[1].toLowerCase()}@email.com`,
              age: (20 + index).toString(),
              gender: index % 2 === 0 ? 'Masculino' : 'Femenino',
              generalDescription: 'Paciente registrado para control general.',
              allergies: index % 3 === 0 ? 'Penicilina' : 'Ninguna',
              medicalHistory: index % 4 === 0 ? ['Diabetes'] : [],
              createdAt
          });

          // 4. Tratamientos y Pagos (Historical)
          const cost = (index + 1) * 150;
          const paid = index % 2 === 0 ? cost / 2 : cost;

          this.treatments.push({
              id: `t-${id}`,
              patientId: id,
              patientName: `${name[0]} ${name[1]}`,
              procedure: this.procedures[index % this.procedures.length].name,
              description: 'Tratamiento realizado satisfactoriamente.',
              cost: cost,
              status: 'Completado',
              date: new Date(new Date(createdAt).getTime() + 86400000).toISOString()
          });

          if (paid > 0) {
              this.payments.push({
                  id: `p-${id}`,
                  patientId: id,
                  patientName: `${name[0]} ${name[1]}`,
                  amount: paid,
                  date: new Date(new Date(createdAt).getTime() + 90000000).toISOString(),
                  method: index % 3 === 0 ? 'QR' : 'Efectivo',
                  status: 'completed',
                  notes: 'Pago a cuenta'
              });
          }

          // 5. Citas (Mix of past and near future)
          const appointmentDate = new Date();
          if (index < 7) {
              appointmentDate.setDate(appointmentDate.getDate() - (index + 1)); 
          } else {
              appointmentDate.setDate(appointmentDate.getDate() + (index - 6)); 
          }
          appointmentDate.setHours(9 + (index % 8), 0, 0, 0);

          this.appointments.push({
              id: `a-${id}`,
              patientId: id,
              patientName: `${name[0]} ${name[1]}`,
              date: appointmentDate.toISOString(),
              type: index % 2 === 0 ? 'Tratamiento' : 'Consulta',
              status: index < 7 ? 'Completada' : 'Pendiente',
              notes: this.procedures[index % this.procedures.length].name
          });
      });

      // --- 2026 FUTURE DATA SEEDING ---
      const patient2026Id = '202601';
      this.patients.push({
          id: patient2026Id,
          firstName: 'Futuro',
          lastName: 'Ejemplo 2026',
          dni: '20262026 LP',
          phone: '7772026',
          email: 'futuro@2026.com',
          age: '30',
          gender: 'Masculino',
          generalDescription: 'Paciente agendado para ortodoncia a largo plazo en 2026',
          allergies: 'Ninguna',
          medicalHistory: [],
          createdAt: now.toISOString()
      });

      // Future Appointments 2026
      const dateJan2026 = new Date('2026-01-15T10:00:00');
      const dateFeb2026 = new Date('2026-02-10T15:30:00');

      this.appointments.push(
          {
              id: 'appt-2026-1',
              patientId: patient2026Id,
              patientName: 'Futuro Ejemplo 2026',
              date: dateJan2026.toISOString(),
              type: 'Tratamiento',
              status: 'Pendiente',
              notes: 'Inicio Ortodoncia 2026'
          },
          {
              id: 'appt-2026-2',
              patientId: patient2026Id,
              patientName: 'Futuro Ejemplo 2026',
              date: dateFeb2026.toISOString(),
              type: 'Revisión',
              status: 'Pendiente',
              notes: 'Control Mensual Febrero'
          }
      );

      // A completed treatment "in the future" (simulating we are viewing this later, or advanced planning)
      // Let's add a treatment that happened "today" but date stamped for planning purposes
      this.treatments.push({
          id: 't-2026-1',
          patientId: patient2026Id,
          patientName: 'Futuro Ejemplo 2026',
          procedure: 'Ortodoncia Mensual',
          description: 'Pago adelantado de la primera cuota de 2026',
          cost: 350,
          status: 'Planificado', // New status use
          date: new Date('2026-01-01T09:00:00').toISOString()
      });

      // A payment for 2026
      this.payments.push({
          id: 'p-2026-1',
          patientId: patient2026Id,
          patientName: 'Futuro Ejemplo 2026',
          amount: 350,
          date: new Date('2026-01-01T09:15:00').toISOString(),
          method: 'Transferencia',
          status: 'completed',
          notes: 'Adelanto Enero 2026'
      });

      // 6. Recordatorios
      this.reminders = [
          { id: 'r1', text: 'Comprar insumos de endodoncia', completed: false, createdAt: now.toISOString(), createdBy: 'Dr. Taboada', createdById: '1' },
          { id: 'r2', text: 'Llamar al técnico dental', completed: true, createdAt: now.toISOString(), createdBy: 'Secretaria', createdById: '2' },
          { id: 'r3', text: 'Revisar agenda de la próxima semana', completed: false, createdAt: now.toISOString(), createdBy: 'Dr. Taboada', createdById: '1' },
          { id: 'r4', text: 'Planificar vacaciones 2026', completed: false, createdAt: now.toISOString(), createdBy: 'Dr. Taboada', createdById: '1' }
      ];

      // 7. SEED ODONTOGRAM & DIAGNOSTIC SESSION
      const examplePatientId = '100';
      this.odontograms.push({
          id: 'od-seed-1',
          patientId: examplePatientId,
          updatedAt: now.toISOString(),
          details: [
              { toothNumber: 18, face: 'whole', condition: 'missing', notes: 'Extracción indicada' },
              { toothNumber: 16, face: 'center', condition: 'caries', notes: 'Caries oclusal profunda' },
              { toothNumber: 16, face: 'left', condition: 'caries', notes: '' },
              { toothNumber: 21, face: 'whole', condition: 'restoration_good', notes: 'Corona porcelana' },
              { toothNumber: 46, face: 'whole', condition: 'bridge', notes: 'Pilar puente' },
              { toothNumber: 45, face: 'whole', condition: 'missing', notes: 'Póntico' },
              { toothNumber: 44, face: 'whole', condition: 'bridge', notes: 'Pilar puente' },
          ]
      });

      // 2026 Odontogram for Future Patient
      this.odontograms.push({
          id: 'od-seed-2026',
          patientId: patient2026Id,
          updatedAt: new Date('2026-01-01T10:00:00').toISOString(),
          details: [
              { toothNumber: 11, face: 'whole', condition: 'veneer', notes: 'Carilla estética' },
              { toothNumber: 21, face: 'whole', condition: 'veneer', notes: 'Carilla estética' }
          ]
      });

      this.diagnosticSessions.push({
          id: 'ds-seed-1',
          patientId: examplePatientId,
          doctorId: '1',
          doctorName: 'Dr. Taboada',
          date: new Date(now.getTime() - 86400000 * 5).toISOString(),
          cie10Code: 'K02.1',
          cie10Name: 'Caries de la dentina',
          evolutionNotes: 'Paciente acude por molestia a los cambios térmicos en pieza 16. Se observa caries profunda. Se indica endodoncia.',
          prescription: [
              { id: 'rx-1', medication: 'Ibuprofeno', dosage: '400mg', frequency: '8 horas', duration: '3 días' }
          ],
          odontogramSnapshot: []
      });

      // 2026 Session
      this.diagnosticSessions.push({
          id: 'ds-seed-2026',
          patientId: patient2026Id,
          doctorId: '1',
          doctorName: 'Dr. Taboada',
          date: new Date('2026-01-01T10:30:00').toISOString(),
          cie10Code: 'Z01.2',
          cie10Name: 'Examen odontológico',
          evolutionNotes: 'Planificación de diseño de sonrisa para 2026. Se toman impresiones y fotos.',
          prescription: [],
          odontogramSnapshot: [],
          nextVisitPlan: ['Entrega de mockup', 'Preparación de carillas']
      });

      // Extra data for demos
      const p101_id = '101';
      this.odontograms.push({
          id: 'od-seed-101',
          patientId: p101_id,
          updatedAt: new Date(now.getTime() - 86400000 * 20).toISOString(),
          details: [
              { toothNumber: 16, face: 'center', condition: 'sealant', notes: 'Sellante preventivo' },
              { toothNumber: 26, face: 'center', condition: 'sealant', notes: 'Sellante preventivo' },
              { toothNumber: 36, face: 'center', condition: 'caries', notes: 'Incipiente' },
              { toothNumber: 46, face: 'center', condition: 'sealant', notes: 'Sellante preventivo' }
          ]
      });
      
      this.save();
  }

  private load() {
    try {
      this.users = JSON.parse(localStorage.getItem('db_users') || '[]');
      this.patients = JSON.parse(localStorage.getItem('db_patients') || '[]');
      this.appointments = JSON.parse(localStorage.getItem('db_appointments') || '[]');
      this.payments = JSON.parse(localStorage.getItem('db_payments') || '[]');
      this.treatments = JSON.parse(localStorage.getItem('db_treatments') || '[]');
      this.odontograms = JSON.parse(localStorage.getItem('db_odontograms') || '[]');
      this.reminders = JSON.parse(localStorage.getItem('db_reminders') || '[]');
      this.procedures = JSON.parse(localStorage.getItem('db_procedures') || '[]');
      this.diagnosticSessions = JSON.parse(localStorage.getItem('db_diagnosticSessions') || '[]');
      this.medicalImages = JSON.parse(localStorage.getItem('db_images') || '[]');
      const goal = localStorage.getItem('db_goal');
      if (goal) this.financialGoal = parseFloat(goal);
      this.logo = localStorage.getItem('db_logo');
      const savedSchedule = localStorage.getItem('db_schedule');
      if (savedSchedule) this.schedule = JSON.parse(savedSchedule);
    } catch (e) {
      console.error("Error loading DB", e);
      // Fallback to seed if corruption occurs
      this.seedData();
    }
  }

  private save() {
    localStorage.setItem('db_users', JSON.stringify(this.users));
    localStorage.setItem('db_patients', JSON.stringify(this.patients));
    localStorage.setItem('db_appointments', JSON.stringify(this.appointments));
    localStorage.setItem('db_payments', JSON.stringify(this.payments));
    localStorage.setItem('db_treatments', JSON.stringify(this.treatments));
    localStorage.setItem('db_odontograms', JSON.stringify(this.odontograms));
    localStorage.setItem('db_reminders', JSON.stringify(this.reminders));
    localStorage.setItem('db_procedures', JSON.stringify(this.procedures));
    localStorage.setItem('db_diagnosticSessions', JSON.stringify(this.diagnosticSessions));
    localStorage.setItem('db_images', JSON.stringify(this.medicalImages));
    localStorage.setItem('db_goal', this.financialGoal.toString());
    if(this.logo) localStorage.setItem('db_logo', this.logo);
    localStorage.setItem('db_schedule', JSON.stringify(this.schedule));
  }

  // --- IMAGES ---
  getImagesByPatient(patientId: string) {
      return this.medicalImages
          .filter(img => img.patientId === patientId)
          .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  addImage(img: MedicalImage) {
      this.medicalImages.push(img);
      this.save();
  }

  deleteImage(id: string) {
      this.medicalImages = this.medicalImages.filter(img => img.id !== id);
      this.save();
  }

  // --- CONFIG (Schedule) ---
  getSchedule() { return this.schedule; }
  setSchedule(s: ClinicSchedule) {
      this.schedule = s;
      this.save();
  }

  getBolivianHolidays(year: number) {
      return [
          { date: `${year}-01-01`, name: 'Año Nuevo' },
          { date: `${year}-01-22`, name: 'Estado Plurinacional' },
          { date: `${year}-03-03`, name: 'Carnaval (L)' },
          { date: `${year}-03-04`, name: 'Carnaval (M)' },
          { date: `${year}-04-18`, name: 'Viernes Santo' },
          { date: `${year}-05-01`, name: 'Día del Trabajo' },
          { date: `${year}-06-19`, name: 'Corpus Christi' },
          { date: `${year}-06-21`, name: 'Año Nuevo Aymara' },
          { date: `${year}-08-06`, name: 'Día de la Independencia' },
          { date: `${year}-11-02`, name: 'Todos Santos' },
          { date: `${year}-12-25`, name: 'Navidad' },
      ];
  }

  // --- AUTH ---
  getLogo() { return this.logo; }
  setLogo(data: string | null) {
      this.logo = data;
      this.save();
  }

  login(u: string, p: string): User | undefined {
    const user = this.users.find(user => user.username === u && user.password === p);
    if (user) {
        user.lastAccess = new Date().toISOString();
        this.save();
        return user;
    }
    return undefined;
  }
  
  getUsers() { return this.users; }
  addUser(u: Omit<User, 'id' | 'lastAccess'>) {
      const newUser: User = { ...u, id: Math.random().toString(36).substr(2, 9), lastAccess: new Date().toISOString() };
      this.users.push(newUser);
      this.save();
  }
  updateUser(id: string, data: Partial<User>) {
      const idx = this.users.findIndex(u => u.id === id);
      if(idx !== -1) {
          this.users[idx] = { ...this.users[idx], ...data };
          this.save();
      }
  }
  deleteUser(id: string) {
      this.users = this.users.filter(u => u.id !== id);
      this.save();
  }

  // --- PATIENTS ---
  getPatients() { return this.patients; }
  getPatient(id: string) { return this.patients.find(p => p.id === id); }
  addPatient(p: Patient) {
      if (!p.id) p.id = Math.random().toString(36).substr(2, 9);
      if (!p.createdAt) p.createdAt = new Date().toISOString();
      this.patients.push(p);
      this.save();
  }
  updatePatient(id: string, p: Patient) {
      const idx = this.patients.findIndex(pat => pat.id === id);
      if(idx !== -1) {
          this.patients[idx] = p;
          this.save();
      }
  }
  deletePatient(id: string) {
      this.patients = this.patients.filter(p => p.id !== id);
      this.save();
  }
  searchPatients(query: string) {
      const q = query.toLowerCase();
      return this.patients.filter(p => 
          p.firstName.toLowerCase().includes(q) || 
          p.lastName.toLowerCase().includes(q) || 
          p.dni.includes(q)
      );
  }

  // --- APPOINTMENTS ---
  getAppointments() { return this.appointments; }
  addAppointment(a: any) {
      const newAppt: Appointment = {
          ...a,
          id: a.id || Math.random().toString(36).substr(2, 9)
      };
      this.appointments.push(newAppt);
      this.save();
  }
  cancelAppointment(id: string) {
      const idx = this.appointments.findIndex(a => a.id === id);
      if(idx !== -1) {
          this.appointments[idx].status = 'Cancelada';
          this.save();
      }
  }
  completeAppointment(id: string) {
      const idx = this.appointments.findIndex(a => a.id === id);
      if(idx !== -1) {
          this.appointments[idx].status = 'Completada';
          this.save();
      }
  }

  // --- PAYMENTS & FINANCE ---
  getPayments() { return this.payments; }
  addPayment(p: any) {
      const newPayment: Payment = {
          ...p,
          id: p.id || Math.random().toString(36).substr(2, 9),
          status: 'completed'
      };
      this.payments.push(newPayment);
      this.save();
  }
  cancelPayment(id: string) {
      const idx = this.payments.findIndex(p => p.id === id);
      if(idx !== -1) {
          this.payments[idx].status = 'cancelled';
          this.save();
      }
  }

  getFinancialGoal() { return this.financialGoal; }
  
  getPatientBalance(patientId: string) {
      const ptTreatments = this.treatments.filter(t => t.patientId === patientId);
      const ptPayments = this.payments.filter(p => p.patientId === patientId && p.status !== 'cancelled');
      
      const totalCost = ptTreatments.reduce((sum, t) => sum + t.cost, 0);
      const totalPaid = ptPayments.reduce((sum, p) => sum + p.amount, 0);
      
      return {
          totalCost,
          totalPaid,
          debt: totalCost - totalPaid
      };
  }

  getDebtors() {
      return this.patients.map(p => {
          const { debt } = this.getPatientBalance(p.id);
          return { patient: p, debt };
      }).filter(d => d.debt > 0);
  }

  // --- TREATMENTS ---
  getTreatmentsByPatient(patientId: string) {
      return this.treatments.filter(t => t.patientId === patientId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  saveIntegralVisit(data: { patient: Patient, treatment: any, payment: any }) {
      const treatment: Treatment = {
          id: Math.random().toString(36).substr(2, 9),
          patientId: data.patient.id,
          patientName: `${data.patient.firstName} ${data.patient.lastName}`,
          ...data.treatment
      };
      this.treatments.push(treatment);

      if (data.payment.amount > 0) {
          this.addPayment({
              patientId: data.patient.id,
              patientName: `${data.patient.firstName} ${data.patient.lastName}`,
              amount: data.payment.amount,
              date: new Date().toISOString(),
              method: data.payment.method,
              relatedProcedure: treatment.procedure,
              notes: 'Pago en atención integral'
          });
      } else {
          this.save();
      }
  }

  // --- DIAGNOSTIC MODULE ---
  saveDiagnosticSession(session: DiagnosticSession) {
      this.diagnosticSessions.push(session);
      this.save();
  }

  getDiagnosticSessionsByPatient(patientId: string): DiagnosticSession[] {
      return this.diagnosticSessions
          .filter(s => s.patientId === patientId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // --- ODONTOGRAM ---
  getOdontogram(patientId: string): OdontogramRecord | undefined {
      return this.odontograms.find(o => o.patientId === patientId);
  }

  saveOdontogram(record: OdontogramRecord): void {
      const index = this.odontograms.findIndex(o => o.patientId === record.patientId);
      if (index !== -1) {
          this.odontograms[index] = record;
      } else {
          this.odontograms.push(record);
      }
      this.save();
  }

  // --- STATS & UTILS ---
  getStats(): DashboardStats {
      const totalIncome = this.payments.filter(p => p.status !== 'cancelled').reduce((acc, curr) => acc + curr.amount, 0);
      const totalPatients = this.patients.length;
      const todayStr = this.getNowLaPaz().toDateString();
      const appointmentsToday = this.appointments.filter(a => new Date(a.date).toDateString() === todayStr && a.status !== 'Cancelada').length;
      const pendingAppointments = this.appointments.filter(a => a.status === 'Pendiente').length;

      return {
          totalIncome,
          totalPatients,
          appointmentsToday,
          pendingAppointments
      };
  }

  getNowLaPaz(): Date {
      return new Date();
  }

  getRecentTreatedPatients() {
      const sortedTreatments = [...this.treatments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const recent: {patient: Patient, lastTreatment: Treatment}[] = [];
      const seenIds = new Set<string>();

      for(const t of sortedTreatments) {
          if (!seenIds.has(t.patientId)) {
              const p = this.patients.find(pat => pat.id === t.patientId);
              if (p) {
                  recent.push({ patient: p, lastTreatment: t });
                  seenIds.add(t.patientId);
              }
          }
          if (recent.length >= 5) break;
      }
      return recent;
  }

  // --- REMINDERS ---
  getReminders() { return this.reminders; }
  addReminder(text: string, user: User) {
      this.reminders.push({
          id: Math.random().toString(36).substr(2, 9),
          text,
          completed: false,
          createdAt: new Date().toISOString(),
          createdBy: user.name,
          createdById: user.id
      });
      this.save();
  }
  toggleReminder(id: string) {
      const r = this.reminders.find(rem => rem.id === id);
      if(r) {
          r.completed = !r.completed;
          this.save();
      }
  }
  deleteReminder(id: string) {
      this.reminders = this.reminders.filter(r => r.id !== id);
      this.save();
  }

  // --- CONFIG (UNIFIED) ---
  getProcedures() { return this.procedures; }
  addProcedure(data: {name: string, price: number}) {
      this.procedures.push({ id: Math.random().toString(36).substr(2,9), ...data });
      this.save();
  }
  removeProcedure(id: string) {
      this.procedures = this.procedures.filter(p => p.id !== id);
      this.save();
  }

  getConsultationReasons() { 
      return this.procedures.map(p => p.name); 
  }

  formatTime(isoString: string) {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getCIE10Codes(query: string) {
      const mockDB = [
          { code: 'K02.0', name: 'Caries limitada al esmalte' },
          { code: 'K02.1', name: 'Caries de la dentina' },
          { code: 'K04.0', name: 'Pulpitis' },
          { code: 'K04.1', name: 'Necrosis de la pulpa' },
          { code: 'K05.0', name: 'Gingivitis aguda' },
          { code: 'K05.1', name: 'Gingivitis crónica' },
          { code: 'K08.1', name: 'Pérdida de dientes debida a accidente' },
          { code: 'K00.0', name: 'Anodoncia' },
          { code: 'S02.5', name: 'Fractura de los dientes' },
          { code: 'K03.6', name: 'Depósitos (acrecentamientos) en los dientes' },
          { code: 'K05.3', name: 'Periodontitis crónica' },
          { code: 'K07.4', name: 'Maloclusión, no especificada' },
          { code: 'K02.9', name: 'Caries dental, no especificada' },
          { code: 'Z01.2', name: 'Examen odontológico' }
      ];
      
      const q = query.toLowerCase();
      
      if (!q) return mockDB; // Return all/top recommendations if query is empty

      // Optimized Sorting: Starts with > Contains
      return mockDB.filter(c => 
          c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      ).sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(q) || a.code.toLowerCase().startsWith(q);
          const bStarts = b.name.toLowerCase().startsWith(q) || b.code.toLowerCase().startsWith(q);
          
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return 0;
      });
  }
}

export const db = new DBService();
