const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// GET /api/roles
const getAllRoles = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY role_id');
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/roles/:id
const getRoleById = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles WHERE role_id = ?', [req.params.id]);
    if (!rows.length) return sendError(res, 'Role not found', 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/roles
const createRole = async (req, res, next) => {
  try {
    const { role_name } = req.body;
    if (!role_name) return sendError(res, 'role_name is required', 400);

    const [result] = await pool.query(
      'INSERT INTO roles (role_name) VALUES (?)',
      [role_name]
    );
    return sendCreated(res, { role_id: result.insertId, role_name }, 'Role created successfully');
  } catch (err) {
    next(err);
  }
};

// PUT /api/roles/:id
const updateRole = async (req, res, next) => {
  try {
    const { role_name } = req.body;
    if (!role_name) return sendError(res, 'role_name is required', 400);

    const [result] = await pool.query(
      'UPDATE roles SET role_name = ? WHERE role_id = ?',
      [role_name, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Role not found', 404);
    return sendSuccess(res, null, 'Role updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/roles/:id
const deleteRole = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM roles WHERE role_id = ?', [req.params.id]);
    if (!result.affectedRows) return sendError(res, 'Role not found', 404);
    return sendSuccess(res, null, 'Role deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllRoles, getRoleById, createRole, updateRole, deleteRole };