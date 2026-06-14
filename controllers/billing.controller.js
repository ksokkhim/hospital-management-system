const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');

// GET /api/billings
const getAllBillings = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { payment_status } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (payment_status) { where += ' AND b.payment_status = ?'; params.push(payment_status); }

    const [rows] = await pool.query(
      `SELECT b.*, p.full_name AS patient_name, p.phone AS patient_phone
         FROM billings b
         JOIN patients p ON b.patient_id = p.patient_id
        ${where}
        ORDER BY b.billing_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM billings b ${where}`, params
    );
    return sendPaginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /api/billings/:id
const getBillingById = async (req, res, next) => {
  try {
    const [bills] = await pool.query(
      `SELECT b.*, p.full_name AS patient_name, p.phone AS patient_phone
         FROM billings b
         JOIN patients p ON b.patient_id = p.patient_id
        WHERE b.billing_id = ?`,
      [req.params.id]
    );
    if (!bills.length) return sendError(res, 'Billing not found', 404);

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE billing_id = ? ORDER BY payment_date DESC',
      [req.params.id]
    );
    return sendSuccess(res, { ...bills[0], payments });
  } catch (err) {
    next(err);
  }
};

// POST /api/billings
const createBilling = async (req, res, next) => {
  try {
    const { patient_id, appointment_id, admission_id, billing_date,
            consultation_fee, medicine_fee, room_fee, other_fee } = req.body;

    const total = (+consultation_fee||0) + (+medicine_fee||0) + (+room_fee||0) + (+other_fee||0);

    const [result] = await pool.query(
      `INSERT INTO billings (patient_id, appointment_id, admission_id, billing_date,
        consultation_fee, medicine_fee, room_fee, other_fee, total_amount, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unpaid')`,
      [patient_id, appointment_id, admission_id, billing_date,
       consultation_fee||0, medicine_fee||0, room_fee||0, other_fee||0, total]
    );
    return sendCreated(res, { billing_id: result.insertId, total_amount: total }, 'Billing created');
  } catch (err) {
    next(err);
  }
};

// POST /api/billings/:id/payments  — record a payment
const addPayment = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { payment_date, payment_method, amount_paid, transaction_no } = req.body;

    // Insert payment
    const [pResult] = await conn.query(
      `INSERT INTO payments (billing_id, payment_date, payment_method, amount_paid, transaction_no, status)
       VALUES (?, ?, ?, ?, ?, 'Completed')`,
      [req.params.id, payment_date, payment_method, amount_paid, transaction_no]
    );

    // Sum all payments and compare to total
    const [[{ paid_total }]] = await conn.query(
      "SELECT SUM(amount_paid) AS paid_total FROM payments WHERE billing_id = ? AND status = 'Completed'",
      [req.params.id]
    );
    const [[bill]] = await conn.query('SELECT total_amount FROM billings WHERE billing_id = ?', [req.params.id]);
    const newStatus = paid_total >= bill.total_amount ? 'Paid' : 'Partial';

    await conn.query('UPDATE billings SET payment_status = ? WHERE billing_id = ?', [newStatus, req.params.id]);
    await conn.commit();

    return sendCreated(res, { payment_id: pResult.insertId, billing_status: newStatus }, 'Payment recorded');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = { getAllBillings, getBillingById, createBilling, addPayment };
