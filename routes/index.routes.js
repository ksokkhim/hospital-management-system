// ── doctors ───────────────────────────────────────────────────────────────────
const doctorRouter = require('express').Router();
const {
  getAllDoctors, getDoctorById, createDoctor, updateDoctor,
  deleteDoctor, getDoctorAppointments,
} = require('../controllers/doctor.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

doctorRouter.use(authenticate);
doctorRouter.get('/',                 getAllDoctors);
doctorRouter.get('/:id',              getDoctorById);
doctorRouter.get('/:id/appointments', getDoctorAppointments);
doctorRouter.post('/',   authorize('Admin'),   createDoctor);
doctorRouter.put('/:id', authorize('Admin'),   updateDoctor);
doctorRouter.delete('/:id', authorize('Admin'),deleteDoctor);

// ── patients ──────────────────────────────────────────────────────────────────
const patientRouter = require('express').Router();
const {
  getAllPatients, getPatientById, createPatient, updatePatient,
  deletePatient, getPatientMedicalRecords, getPatientAppointments,
} = require('../controllers/patient.controller');

patientRouter.use(authenticate);
patientRouter.get('/',                       getAllPatients);
patientRouter.get('/:id',                    getPatientById);
patientRouter.get('/:id/medical-records',    getPatientMedicalRecords);
patientRouter.get('/:id/appointments',       getPatientAppointments);
patientRouter.post('/',                      createPatient);
patientRouter.put('/:id',                    updatePatient);
patientRouter.delete('/:id', authorize('Admin'), deletePatient);

// ── appointments ──────────────────────────────────────────────────────────────
const apptRouter = require('express').Router();
const {
  getAllAppointments, getAppointmentById, createAppointment,
  updateAppointment, updateAppointmentStatus, deleteAppointment,
} = require('../controllers/appointment.controller');

apptRouter.use(authenticate);
apptRouter.get('/',             getAllAppointments);
apptRouter.get('/:id',          getAppointmentById);
apptRouter.post('/',            createAppointment);
apptRouter.put('/:id',          updateAppointment);
apptRouter.patch('/:id/status', updateAppointmentStatus);
apptRouter.delete('/:id',       deleteAppointment);

// ── medical records ───────────────────────────────────────────────────────────
const recordRouter = require('express').Router();
const {
  getAllRecords, getRecordById, createRecord, updateRecord,
} = require('../controllers/medicalRecord.controller');

recordRouter.use(authenticate);
recordRouter.get('/',      getAllRecords);
recordRouter.get('/:id',   getRecordById);
recordRouter.post('/',     authorize('Doctor'), createRecord);
recordRouter.put('/:id',   authorize('Doctor'), updateRecord);

// ── prescriptions ─────────────────────────────────────────────────────────────
const rxRouter = require('express').Router();
const {
  getPrescriptionById, createPrescription, updatePrescription,
} = require('../controllers/prescription.controller');

rxRouter.use(authenticate);
rxRouter.get('/:id',   getPrescriptionById);
rxRouter.post('/',     authorize('Doctor'), createPrescription);
rxRouter.put('/:id',   authorize('Doctor'), updatePrescription);

// ── medicines ─────────────────────────────────────────────────────────────────
const medRouter = require('express').Router();
const {
  getAllMedicines, getMedicineById, createMedicine, updateMedicine, deleteMedicine,
} = require('../controllers/medicine.controller');

medRouter.use(authenticate);
medRouter.get('/',       getAllMedicines);
medRouter.get('/:id',    getMedicineById);
medRouter.post('/',      authorize('Admin', 'Pharmacist'), createMedicine);
medRouter.put('/:id',    authorize('Admin', 'Pharmacist'), updateMedicine);
medRouter.delete('/:id', authorize('Admin'),               deleteMedicine);

// ── billings ──────────────────────────────────────────────────────────────────
const billRouter = require('express').Router();
const {
  getAllBillings, getBillingById, createBilling, addPayment,
} = require('../controllers/billing.controller');

billRouter.use(authenticate);
billRouter.get('/',              getAllBillings);
billRouter.get('/:id',           getBillingById);
billRouter.post('/',             createBilling);
billRouter.post('/:id/payments', addPayment);

// ── admissions ────────────────────────────────────────────────────────────────
const admitRouter = require('express').Router();
const {
  getAllAdmissions, createAdmission, dischargePatient,
} = require('../controllers/admission.controller');

admitRouter.use(authenticate);
admitRouter.get('/',                getAllAdmissions);
admitRouter.post('/',               createAdmission);
admitRouter.patch('/:id/discharge', dischargePatient);

// ── departments, rooms, staff, dashboard ──────────────────────────────────────
const miscRouter = require('express').Router();
const {
  getAllDepartments, createDepartment, updateDepartment, deleteDepartment,
  getAllRooms, createRoom, updateRoom,
  getAllStaff, createStaff,
  getDashboardStats,
} = require('../controllers/misc.controller');

miscRouter.use(authenticate);
// Departments
miscRouter.get('/departments',        getAllDepartments);
miscRouter.post('/departments',       authorize('Admin'), createDepartment);
miscRouter.put('/departments/:id',    authorize('Admin'), updateDepartment);
miscRouter.delete('/departments/:id', authorize('Admin'), deleteDepartment);
// Rooms
miscRouter.get('/rooms',              getAllRooms);
miscRouter.post('/rooms',             authorize('Admin'), createRoom);
miscRouter.put('/rooms/:id',          authorize('Admin'), updateRoom);
// Staff
miscRouter.get('/staff',              authorize('Admin'), getAllStaff);
miscRouter.post('/staff',             authorize('Admin'), createStaff);
// Dashboard
miscRouter.get('/dashboard',          getDashboardStats);


// appointments — Patient books, others view
apptRouter.post('/', authorize('Patient'), createAppointment);

// medical records — Doctor only
recordRouter.post('/',   authorize('Doctor'), createRecord);
recordRouter.put('/:id', authorize('Doctor'), updateRecord);

// prescriptions — Doctor only
rxRouter.post('/',   authorize('Doctor'), createPrescription);
rxRouter.put('/:id', authorize('Doctor'), updatePrescription);

// medicines — Admin or Pharmacist
medRouter.post('/',      authorize('Admin', 'Pharmacist'), createMedicine);
medRouter.put('/:id',    authorize('Admin', 'Pharmacist'), updateMedicine);
medRouter.delete('/:id', authorize('Admin'),               deleteMedicine);

// billings — Admin or Receptionist creates, Cashier adds payment
billRouter.post('/',             authorize('Admin', 'Receptionist'), createBilling);
billRouter.post('/:id/payments', authorize('Admin', 'Cashier', 'Receptionist'), addPayment);

// departments — Admin only
miscRouter.post('/departments',       authorize('Admin'), createDepartment);
miscRouter.put('/departments/:id',    authorize('Admin'), updateDepartment);
miscRouter.delete('/departments/:id', authorize('Admin'), deleteDepartment);

module.exports = { doctorRouter, patientRouter, apptRouter, recordRouter, rxRouter, medRouter, billRouter, admitRouter, miscRouter };
