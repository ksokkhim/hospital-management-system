const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');

// GET /api/patients
const getAllPatients = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : '%';

    const [rows] = await pool.query(
      `SELECT * FROM patients
        WHERE full_name LIKE ? OR patient_code LIKE ? OR phone LIKE ? OR email LIKE ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [search, search, search, search, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM patients
        WHERE full_name LIKE ? OR patient_code LIKE ? OR phone LIKE ? OR email LIKE ?`,
      [search, search, search, search]
    );
    return sendPaginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/patients/:id
const getPatientById = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
    if (!rows.length) return sendError(res, 'Patient not found', 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/patients
const createPatient = async (req, res, next) => {
  try {
    const { patient_code, full_name, gender, date_of_birth, phone, email, address, blood_group, emergency_contact } = req.body;
    const [result] = await pool.query(
      `INSERT INTO patients (patient_code, full_name, gender, date_of_birth, phone, email, address, blood_group, emergency_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_code, full_name, gender, date_of_birth, phone, email, address, blood_group, emergency_contact]
    );
    return sendCreated(res, { patient_id: result.insertId }, 'Patient registered successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/patients/:id
const updatePatient = async (req, res, next) => {
  try {
    const { full_name, gender, date_of_birth, phone, email, address, blood_group, emergency_contact } = req.body;
    const [result] = await pool.query(
      `UPDATE patients SET full_name=?, gender=?, date_of_birth=?, phone=?, email=?, address=?, blood_group=?, emergency_contact=?
        WHERE patient_id=?`,
      [full_name, gender, date_of_birth, phone, email, address, blood_group, emergency_contact, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Patient not found', 404);
    return sendSuccess(res, null, 'Patient updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/patients/:id
const deletePatient = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM patients WHERE patient_id = ?', [req.params.id]);
    if (!result.affectedRows) return sendError(res, 'Patient not found', 404);
    return sendSuccess(res, null, 'Patient deleted successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/patients/:id/medical-records
const getPatientMedicalRecords = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT mr.*, u.full_name AS doctor_name, d.specialization
         FROM medical_records mr
         JOIN doctors doc ON mr.doctor_id  = doc.doctor_id
         JOIN users u     ON doc.user_id   = u.user_id
         JOIN doctors d   ON mr.doctor_id  = d.doctor_id
        WHERE mr.patient_id = ?
        ORDER BY mr.record_date DESC`,
      [req.params.id]
    );
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/patients/:id/appointments
const getPatientAppointments = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.full_name AS doctor_name, d.specialization, dep.department_name
         FROM appointments a
         JOIN doctors d     ON a.doctor_id     = d.doctor_id
         JOIN users u       ON d.user_id       = u.user_id
         JOIN departments dep ON d.department_id = dep.department_id
        WHERE a.patient_id = ?
        ORDER BY a.appointment_date DESC`,
      [req.params.id]
    );
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPatients, getPatientById, createPatient, updatePatient, deletePatient,
  getPatientMedicalRecords, getPatientAppointments,
};
