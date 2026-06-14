const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');

// GET /api/doctors
const getAllDoctors = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : '%';

    const [rows] = await pool.query(
      `SELECT d.*, u.full_name, u.email, u.phone, u.gender, dep.department_name
         FROM doctors d
         JOIN users u         ON d.user_id       = u.user_id
         JOIN departments dep ON d.department_id = dep.department_id
        WHERE u.full_name LIKE ? OR d.doctor_code LIKE ? OR d.specialization LIKE ?
        ORDER BY d.doctor_id DESC LIMIT ? OFFSET ?`,
      [search, search, search, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM doctors d JOIN users u ON d.user_id = u.user_id
        WHERE u.full_name LIKE ? OR d.doctor_code LIKE ? OR d.specialization LIKE ?`,
      [search, search, search]
    );
    return sendPaginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/doctors/:id
const getDoctorById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, u.full_name, u.email, u.phone, u.gender, u.address,
              dep.department_name
         FROM doctors d
         JOIN users u         ON d.user_id       = u.user_id
         JOIN departments dep ON d.department_id = dep.department_id
        WHERE d.doctor_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return sendError(res, 'Doctor not found', 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/doctors
const createDoctor = async (req, res, next) => {
  try {
    const { user_id, department_id, doctor_code, specialization, qualification, consultation_fee, status } = req.body;
    const [result] = await pool.query(
      `INSERT INTO doctors (user_id, department_id, doctor_code, specialization, qualification, consultation_fee, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, department_id, doctor_code, specialization, qualification, consultation_fee || 0, status || 'Active']
    );
    return sendCreated(res, { doctor_id: result.insertId }, 'Doctor created successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/doctors/:id
const updateDoctor = async (req, res, next) => {
  try {
    const { department_id, doctor_code, specialization, qualification, consultation_fee, status } = req.body;
    const [result] = await pool.query(
      `UPDATE doctors SET department_id=?, doctor_code=?, specialization=?, qualification=?,
              consultation_fee=?, status=? WHERE doctor_id=?`,
      [department_id, doctor_code, specialization, qualification, consultation_fee, status, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Doctor not found', 404);
    return sendSuccess(res, null, 'Doctor updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/doctors/:id
const deleteDoctor = async (req, res, next) => {
  try {
    const [result] = await pool.query('UPDATE doctors SET status = ? WHERE doctor_id = ?', ['Inactive', req.params.id]);
    if (!result.affectedRows) return sendError(res, 'Doctor not found', 404);
    return sendSuccess(res, null, 'Doctor deactivated successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/doctors/:id/appointments
const getDoctorAppointments = async (req, res, next) => {
  try {
    const { date } = req.query;
    let query = `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone
                   FROM appointments a
                   JOIN patients p ON a.patient_id = p.patient_id
                  WHERE a.doctor_id = ?`;
    const params = [req.params.id];
    if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
    query += ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';

    const [rows] = await pool.query(query, params);
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor, getDoctorAppointments };
