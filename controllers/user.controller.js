const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');

// GET /api/users
const getAllUsers = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : '%';

    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.gender, u.phone, u.email, u.username,
              u.address, u.status, u.created_at, r.role_name
         FROM users u JOIN roles r ON u.role_id = r.role_id
        WHERE u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?
        ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [search, search, search, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u
        WHERE u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?`,
      [search, search, search]
    );
    return sendPaginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.gender, u.phone, u.email, u.username,
              u.address, u.status, u.created_at, r.role_name, r.role_id
         FROM users u JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return sendError(res, 'User not found', 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/users
const createUser = async (req, res, next) => {
  try {
    const { role_id, full_name, gender, phone, email, username, password, address, status } = req.body;
    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    const [result] = await pool.query(
      `INSERT INTO users (role_id, full_name, gender, phone, email, username, password, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [role_id, full_name, gender, phone, email, username, hashed, address, status || 'Active']
    );
    return sendCreated(res, { user_id: result.insertId }, 'User created successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { role_id, full_name, gender, phone, email, username, address, status } = req.body;
    const [result] = await pool.query(
      `UPDATE users SET role_id=?, full_name=?, gender=?, phone=?, email=?, username=?, address=?, status=?
        WHERE user_id=?`,
      [role_id, full_name, gender, phone, email, username, address, status, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'User not found', 404);
    return sendSuccess(res, null, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const [result] = await pool.query('UPDATE users SET status = ? WHERE user_id = ?', ['Inactive', req.params.id]);
    if (!result.affectedRows) return sendError(res, 'User not found', 404);
    return sendSuccess(res, null, 'User deactivated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
