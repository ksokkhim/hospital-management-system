const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');

// GET /api/appointments
const getAllAppointments = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status, date, doctor_id } = req.query;

    let where  = 'WHERE 1=1';
    const params = [];
    if (status)    { where += ' AND a.status = ?';           params.push(status); }
    if (date)      { where += ' AND a.appointment_date = ?'; params.push(date); }
    if (doctor_id) { where += ' AND a.doctor_id = ?';        params.push(doctor_id); }

    const [rows] = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone,
              u.full_name AS doctor_name, d.specialization
         FROM appointments a
         JOIN patients p ON a.patient_id = p.patient_id
         JOIN doctors d  ON a.doctor_id  = d.doctor_id
         JOIN users u    ON d.user_id    = u.user_id
        ${where}
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM appointments a ${where}`, params
    );
    return sendPaginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/appointments/:id
const getAppointmentById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone,
              u.full_name AS doctor_name, d.specialization, dep.department_name
         FROM appointments a
         JOIN patients p      ON a.patient_id    = p.patient_id
         JOIN doctors d       ON a.doctor_id     = d.doctor_id
         JOIN users u         ON d.user_id       = u.user_id
         JOIN departments dep ON d.department_id = dep.department_id
        WHERE a.appointment_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return sendError(res, 'Appointment not found', 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/appointments
const createAppointment = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, reason } = req.body;

    // Check for time slot conflict
    const [conflict] = await pool.query(
      `SELECT appointment_id FROM appointments
        WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (conflict.length) {
      return sendError(res, 'This time slot is already booked for the doctor', 409);
    }

    const [result] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id, appointment_date, appointment_time, reason, req.user.user_id]
    );
    return sendCreated(res, { appointment_id: result.insertId }, 'Appointment created successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/appointments/:id
const updateAppointment = async (req, res, next) => {
  try {
    const { appointment_date, appointment_time, reason, status } = req.body;
    const [result] = await pool.query(
      `UPDATE appointments SET appointment_date=?, appointment_time=?, reason=?, status=?
        WHERE appointment_id=?`,
      [appointment_date, appointment_time, reason, status, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Appointment not found', 404);
    return sendSuccess(res, null, 'Appointment updated successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/appointments/:id/status
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    const { status } = req.body;
    if (!validStatuses.includes(status)) {
      return sendError(res, `Status must be one of: ${validStatuses.join(', ')}`, 400);
    }
    const [result] = await pool.query(
      'UPDATE appointments SET status = ? WHERE appointment_id = ?',
      [status, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Appointment not found', 404);
    return sendSuccess(res, null, `Appointment ${status.toLowerCase()} successfully`);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/appointments/:id
const deleteAppointment = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      "UPDATE appointments SET status = 'Cancelled' WHERE appointment_id = ?",
      [req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Appointment not found', 404);
    return sendSuccess(res, null, 'Appointment cancelled');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllAppointments, getAppointmentById, createAppointment,
  updateAppointment, updateAppointmentStatus, deleteAppointment,
};
