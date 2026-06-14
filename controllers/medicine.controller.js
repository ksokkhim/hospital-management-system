const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');

const getAllMedicines = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : '%';

    const [rows] = await pool.query(
      `SELECT * FROM medicines WHERE medicine_name LIKE ? OR medicine_type LIKE ?
        ORDER BY medicine_name ASC LIMIT ? OFFSET ?`,
      [search, search, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM medicines WHERE medicine_name LIKE ? OR medicine_type LIKE ?',
      [search, search]
    );
    return sendPaginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

const getMedicineById = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM medicines WHERE medicine_id = ?', [req.params.id]);
    if (!rows.length) return sendError(res, 'Medicine not found', 404);
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

const createMedicine = async (req, res, next) => {
  try {
    const { medicine_name, medicine_type, unit_price, stock_qty, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO medicines (medicine_name, medicine_type, unit_price, stock_qty, status) VALUES (?, ?, ?, ?, ?)',
      [medicine_name, medicine_type, unit_price||0, stock_qty||0, status||'Active']
    );
    return sendCreated(res, { medicine_id: result.insertId }, 'Medicine added');
  } catch (err) {
    next(err);
  }
};

const updateMedicine = async (req, res, next) => {
  try {
    const { medicine_name, medicine_type, unit_price, stock_qty, status } = req.body;
    const [result] = await pool.query(
      'UPDATE medicines SET medicine_name=?, medicine_type=?, unit_price=?, stock_qty=?, status=? WHERE medicine_id=?',
      [medicine_name, medicine_type, unit_price, stock_qty, status, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Medicine not found', 404);
    return sendSuccess(res, null, 'Medicine updated');
  } catch (err) {
    next(err);
  }
};

const deleteMedicine = async (req, res, next) => {
  try {
    const [result] = await pool.query("UPDATE medicines SET status = 'Inactive' WHERE medicine_id = ?", [req.params.id]);
    if (!result.affectedRows) return sendError(res, 'Medicine not found', 404);
    return sendSuccess(res, null, 'Medicine deactivated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllMedicines, getMedicineById, createMedicine, updateMedicine, deleteMedicine };
