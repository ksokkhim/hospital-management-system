const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { role_id, full_name, gender, phone, email, username, password, address } = req.body;

    // Check required fields
    if (!full_name || !email || !username || !password) {
      return sendError(res, 'full_name, email, username and password are required', 400);
    }

    // Check if email already exists
    const [existEmail] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existEmail.length) return sendError(res, 'Email already registered', 409);

    // Check if username already exists
    const [existUser] = await pool.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existUser.length) return sendError(res, 'Username already taken', 409);

    // Hash password
    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Insert user
    const [result] = await pool.query(
      `INSERT INTO users (role_id, full_name, gender, phone, email, username, password, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [role_id || 3, full_name, gender, phone, email, username, hashed, address]
    );

    // Auto login — return token
    const token = jwt.sign(
      { user_id: result.insertId, role_id: role_id || 3 },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return sendCreated(res, {
      token,
      user: { user_id: result.insertId, full_name, email, username }
    }, 'Account created successfully');
  } catch (err) {
    next(err);
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
      `SELECT u.*, r.role_name
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
        WHERE (u.username = ? OR u.email = ?) AND u.status = 'Active'`,
      [username, username]
    );

    if (!rows.length) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const token = jwt.sign(
      { user_id: user.user_id, role_id: user.role_id, role_name: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _pw, ...userInfo } = user;
    return sendSuccess(res, { token, user: userInfo }, 'Login successful');
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
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    return sendSuccess(res, rows[0]);
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

module.exports = { login, getProfile, changePassword, register };
