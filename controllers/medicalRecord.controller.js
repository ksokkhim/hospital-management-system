const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// GET /api/medical-records
const getAllRecords = async (req, res, next) => {
  try {
    const { patient_id, doctor_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (patient_id) { where += ' AND mr.patient_id = ?'; params.push(patient_id); }
    if (doctor_id)  { where += ' AND mr.doctor_id = ?';  params.push(doctor_id); }

    const [rows] = await pool.query(
      `SELECT mr.*, p.full_name AS patient_name, u.full_name AS doctor_name
         FROM medical_records mr
         JOIN patients p ON mr.patient_id = p.patient_id
         JOIN doctors d  ON mr.doctor_id  = d.doctor_id
         JOIN users u    ON d.user_id     = u.user_id
        ${where}
        ORDER BY mr.record_date DESC`,
      params
    );
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/medical-records/:id
const getRecordById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT mr.*, p.full_name AS patient_name, p.blood_group,
              u.full_name AS doctor_name, d.specialization
         FROM medical_records mr
         JOIN patients p ON mr.patient_id = p.patient_id
         JOIN doctors d  ON mr.doctor_id  = d.doctor_id
         JOIN users u    ON d.user_id     = u.user_id
        WHERE mr.record_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return sendError(res, 'Record not found', 404);

    // Attach prescriptions
    const [prescriptions] = await pool.query(
      `SELECT pr.*, pi.dosage, pi.frequency, pi.duration, pi.instruction,
              m.medicine_name, m.medicine_type
         FROM prescriptions pr
         JOIN prescription_items pi ON pr.prescription_id = pi.prescription_id
         JOIN medicines m           ON pi.medicine_id     = m.medicine_id
        WHERE pr.record_id = ?`,
      [req.params.id]
    );
    return sendSuccess(res, { ...rows[0], prescriptions });
  } catch (err) {
    next(err);
  }
};

// POST /api/medical-records
const createRecord = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_id, diagnosis, symptoms, treatment_note, record_date } = req.body;
    const [result] = await pool.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, symptoms, treatment_note, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id, appointment_id, diagnosis, symptoms, treatment_note, record_date]
    );

    // Mark appointment completed if linked
    if (appointment_id) {
      await pool.query("UPDATE appointments SET status = 'Completed' WHERE appointment_id = ?", [appointment_id]);
    }

    return sendCreated(res, { record_id: result.insertId }, 'Medical record created');
  } catch (err) {
    next(err);
  }
};

// PUT /api/medical-records/:id
const updateRecord = async (req, res, next) => {
  try {
    const { diagnosis, symptoms, treatment_note } = req.body;
    const [result] = await pool.query(
      'UPDATE medical_records SET diagnosis=?, symptoms=?, treatment_note=? WHERE record_id=?',
      [diagnosis, symptoms, treatment_note, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Record not found', 404);
    return sendSuccess(res, null, 'Medical record updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllRecords, getRecordById, createRecord, updateRecord };
