const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// ── DEPARTMENTS ─────────────────────────────────────────────────────────────
const getAllDepartments = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY department_name');
    return sendSuccess(res, rows);
  } catch (err) { next(err); }
};

const createDepartment = async (req, res, next) => {
  try {
    const { department_name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO departments (department_name, description) VALUES (?, ?)',
      [department_name, description]
    );
    return sendCreated(res, { department_id: result.insertId });
  } catch (err) { next(err); }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { department_name, description } = req.body;
    const [result] = await pool.query(
      'UPDATE departments SET department_name=?, description=? WHERE department_id=?',
      [department_name, description, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Department not found', 404);
    return sendSuccess(res, null, 'Department updated');
  } catch (err) { next(err); }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM departments WHERE department_id = ?', [req.params.id]);
    if (!result.affectedRows) return sendError(res, 'Department not found', 404);
    return sendSuccess(res, null, 'Department deleted');
  } catch (err) { next(err); }
};

// ── ROOMS ────────────────────────────────────────────────────────────────────
const getAllRooms = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM rooms';
    const params = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY room_no';
    const [rows] = await pool.query(query, params);
    return sendSuccess(res, rows);
  } catch (err) { next(err); }
};

const createRoom = async (req, res, next) => {
  try {
    const { room_no, room_type, daily_rate, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO rooms (room_no, room_type, daily_rate, status) VALUES (?, ?, ?, ?)',
      [room_no, room_type, daily_rate||0, status||'Available']
    );
    return sendCreated(res, { room_id: result.insertId });
  } catch (err) { next(err); }
};

const updateRoom = async (req, res, next) => {
  try {
    const { room_no, room_type, daily_rate, status } = req.body;
    const [result] = await pool.query(
      'UPDATE rooms SET room_no=?, room_type=?, daily_rate=?, status=? WHERE room_id=?',
      [room_no, room_type, daily_rate, status, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Room not found', 404);
    return sendSuccess(res, null, 'Room updated');
  } catch (err) { next(err); }
};

// ── STAFF ────────────────────────────────────────────────────────────────────
const getAllStaff = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.full_name, u.email, u.phone, dep.department_name
         FROM staff s
         JOIN users u         ON s.user_id       = u.user_id
         JOIN departments dep ON s.department_id = dep.department_id
        ORDER BY s.staff_id DESC`
    );
    return sendSuccess(res, rows);
  } catch (err) { next(err); }
};

const createStaff = async (req, res, next) => {
  try {
    const { user_id, department_id, staff_code, position, hire_date, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO staff (user_id, department_id, staff_code, position, hire_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, department_id, staff_code, position, hire_date, status||'Active']
    );
    return sendCreated(res, { staff_id: result.insertId });
  } catch (err) { next(err); }
};

// ── DASHBOARD / REPORTS ───────────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const [[{ total_patients }]]     = await pool.query('SELECT COUNT(*) AS total_patients FROM patients');
    const [[{ total_doctors }]]      = await pool.query("SELECT COUNT(*) AS total_doctors FROM doctors WHERE status='Active'");
    const [[{ today_appointments }]] = await pool.query(
      "SELECT COUNT(*) AS today_appointments FROM appointments WHERE appointment_date = CURDATE()"
    );
    const [[{ active_admissions }]]  = await pool.query(
      "SELECT COUNT(*) AS active_admissions FROM admissions WHERE status='Admitted'"
    );
    const [[{ available_rooms }]]    = await pool.query(
      "SELECT COUNT(*) AS available_rooms FROM rooms WHERE status='Available'"
    );
    const [[{ unpaid_billings }]]    = await pool.query(
      "SELECT COUNT(*) AS unpaid_billings FROM billings WHERE payment_status='Unpaid'"
    );
    const [[{ monthly_revenue }]]    = await pool.query(
      `SELECT IFNULL(SUM(amount_paid),0) AS monthly_revenue FROM payments
        WHERE status='Completed' AND MONTH(payment_date)=MONTH(CURDATE()) AND YEAR(payment_date)=YEAR(CURDATE())`
    );

    return sendSuccess(res, {
      total_patients, total_doctors, today_appointments,
      active_admissions, available_rooms, unpaid_billings, monthly_revenue,
    });
  } catch (err) { next(err); }
};

module.exports = {
  getAllDepartments, createDepartment, updateDepartment, deleteDepartment,
  getAllRooms, createRoom, updateRoom,
  getAllStaff, createStaff,
  getDashboardStats,
};
