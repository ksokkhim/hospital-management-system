const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// POST /api/auth/register — creates Patient account
const register = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { full_name, gender, date_of_birth, phone, email, username, password, address, blood_group, emergency_contact } = req.body;

    if (!full_name || !email || !username || !password) {
      await conn.rollback();
      return sendError(res, 'full_name, email, username and password are required', 400);
    }

    // Check email exists
    const [existEmail] = await conn.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existEmail.length) {
      await conn.rollback();
      return sendError(res, 'Email already registered', 409);
    }

    // Check username exists
    const [existUser] = await conn.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existUser.length) {
      await conn.rollback();
      return sendError(res, 'Username already taken', 409);
    }

    // Get Patient role
    const [roleRows] = await conn.query("SELECT role_id FROM roles WHERE role_name = 'Patient' LIMIT 1");
    if (!roleRows.length) {
      await conn.rollback();
      return sendError(res, "Role 'Patient' not found. Contact admin.", 500);
    }
    const patientRoleId = roleRows[0].role_id;

    // Hash password
    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Insert user
    const [userResult] = await conn.query(
      `INSERT INTO users (role_id, full_name, gender, phone, email, username, password, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [patientRoleId, full_name, gender, phone, email, username, hashed, address]
    );
    const userId = userResult.insertId;

    // Auto generate patient_code
    const patient_code = `P${String(userId).padStart(5, '0')}`;

    // Insert patient record
    const [patientResult] = await conn.query(
      `INSERT INTO patients (user_id, patient_code, full_name, gender, date_of_birth, phone, email, address, blood_group, emergency_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, patient_code, full_name, gender, date_of_birth || null, phone, email, address, blood_group || null, emergency_contact || null]
    );

    await conn.commit();

    // Generate token
    const token = jwt.sign(
      { user_id: userId, role_id: patientRoleId, role_name: 'Patient' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return sendCreated(res, {
      token,
      user: {
        user_id:    userId,
        full_name,
        email,
        username,
        role_name:  'Patient',
        patient_id: patientResult.insertId,
        patient_code,
      }
    }, 'Account created successfully');

  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return sendError(res, 'Username and password are required', 400);
    }

    const [rows] = await pool.query(
      `SELECT u.*, r.role_name FROM users u
         JOIN roles r ON u.role_id = r.role_id
        WHERE (u.username = ? OR u.email = ?) AND u.status = 'Active'`,
      [username, username]
    );

    if (!rows.length) return sendError(res, 'Invalid credentials', 401);

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return sendError(res, 'Invalid credentials', 401);

    const token = jwt.sign(
      { user_id: user.user_id, role_id: user.role_id, role_name: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _pw, ...userInfo } = user;

    // If patient, attach patient info
    let patientInfo = null;
    if (user.role_name === 'Patient') {
      const [pRows] = await pool.query(
        'SELECT patient_id, patient_code FROM patients WHERE user_id = ?',
        [user.user_id]
      );
      if (pRows.length) patientInfo = pRows[0];
    }

    return sendSuccess(res, {
      token,
      user: { ...userInfo, ...(patientInfo && { patient_info: patientInfo }) }
    }, 'Login successful');

  } catch (err) {
    next(err);
  }
};

// GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.gender, u.phone, u.email, u.username,
              u.address, u.status, u.created_at, r.role_name
         FROM users u JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    let profile = rows[0];

    // Attach patient info if Patient role
    if (profile.role_name === 'Patient') {
      const [pRows] = await pool.query(
        'SELECT * FROM patients WHERE user_id = ?', [req.user.user_id]
      );
      if (pRows.length) profile = { ...profile, patient_info: pRows[0] };
    }

    // Attach doctor info if Doctor role
    if (profile.role_name === 'Doctor') {
      const [dRows] = await pool.query(
        `SELECT d.*, dep.department_name FROM doctors d
           JOIN departments dep ON d.department_id = dep.department_id
          WHERE d.user_id = ?`,
        [req.user.user_id]
      );
      if (dRows.length) profile = { ...profile, doctor_info: dRows[0] };
    }

    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return sendError(res, 'Both current and new password are required', 400);
    }

    const [rows] = await pool.query('SELECT password FROM users WHERE user_id = ?', [req.user.user_id]);
    const match  = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return sendError(res, 'Current password is incorrect', 400);

    const hashed = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, req.user.user_id]);

    return sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, getProfile, changePassword };