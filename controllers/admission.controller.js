const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');

// GET /api/admissions
const getAllAdmissions = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, r.room_no, r.room_type
         FROM admissions a
         JOIN patients p ON a.patient_id = p.patient_id
         JOIN rooms r    ON a.room_id    = r.room_id
        ORDER BY a.admission_date DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM admissions');
    return sendPaginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// POST /api/admissions
const createAdmission = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { patient_id, room_id, admission_date } = req.body;

    // Check room availability
    const [[room]] = await conn.query('SELECT status FROM rooms WHERE room_id = ?', [room_id]);
    if (!room) { await conn.rollback(); return sendError(res, 'Room not found', 404); }
    if (room.status !== 'Available') { await conn.rollback(); return sendError(res, 'Room is not available', 409); }

    const [result] = await conn.query(
      `INSERT INTO admissions (patient_id, room_id, admitted_by, admission_date, status)
       VALUES (?, ?, ?, ?, 'Admitted')`,
      [patient_id, room_id, req.user.user_id, admission_date]
    );
    await conn.query("UPDATE rooms SET status = 'Occupied' WHERE room_id = ?", [room_id]);
    await conn.commit();

    return sendCreated(res, { admission_id: result.insertId }, 'Patient admitted successfully');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PATCH /api/admissions/:id/discharge
const dischargePatient = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { discharge_date } = req.body;

    const [[admission]] = await conn.query(
      "SELECT * FROM admissions WHERE admission_id = ? AND status = 'Admitted'",
      [req.params.id]
    );
    if (!admission) { await conn.rollback(); return sendError(res, 'Active admission not found', 404); }

    await conn.query(
      "UPDATE admissions SET discharge_date=?, status='Discharged' WHERE admission_id=?",
      [discharge_date, req.params.id]
    );
    await conn.query("UPDATE rooms SET status = 'Available' WHERE room_id = ?", [admission.room_id]);
    await conn.commit();

    return sendSuccess(res, null, 'Patient discharged successfully');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = { getAllAdmissions, createAdmission, dischargePatient };
