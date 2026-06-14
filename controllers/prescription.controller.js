const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// GET /api/prescriptions/:id
const getPrescriptionById = async (req, res, next) => {
  try {
    const [prescriptions] = await pool.query(
      `SELECT pr.*, p.full_name AS patient_name, u.full_name AS doctor_name
         FROM prescriptions pr
         JOIN patients p ON pr.patient_id = p.patient_id
         JOIN doctors d  ON pr.doctor_id  = d.doctor_id
         JOIN users u    ON d.user_id     = u.user_id
        WHERE pr.prescription_id = ?`,
      [req.params.id]
    );
    if (!prescriptions.length) return sendError(res, 'Prescription not found', 404);

    const [items] = await pool.query(
      `SELECT pi.*, m.medicine_name, m.medicine_type, m.unit_price
         FROM prescription_items pi
         JOIN medicines m ON pi.medicine_id = m.medicine_id
        WHERE pi.prescription_id = ?`,
      [req.params.id]
    );
    return sendSuccess(res, { ...prescriptions[0], items });
  } catch (err) {
    next(err);
  }
};

// POST /api/prescriptions  — creates prescription + items in a transaction
const createPrescription = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { record_id, patient_id, doctor_id, prescription_date, notes, items } = req.body;

    const [pResult] = await conn.query(
      `INSERT INTO prescriptions (record_id, patient_id, doctor_id, prescription_date, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [record_id, patient_id, doctor_id, prescription_date, notes]
    );
    const prescription_id = pResult.insertId;

    if (items && items.length) {
      for (const item of items) {
        const { medicine_id, dosage, frequency, duration, instruction } = item;
        await conn.query(
          `INSERT INTO prescription_items (prescription_id, medicine_id, dosage, frequency, duration, instruction)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [prescription_id, medicine_id, dosage, frequency, duration, instruction]
        );
        // Deduct stock
        await conn.query(
          'UPDATE medicines SET stock_qty = stock_qty - 1 WHERE medicine_id = ? AND stock_qty > 0',
          [medicine_id]
        );
      }
    }

    await conn.commit();
    return sendCreated(res, { prescription_id }, 'Prescription created successfully');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// PUT /api/prescriptions/:id
const updatePrescription = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const [result] = await pool.query(
      'UPDATE prescriptions SET notes=? WHERE prescription_id=?',
      [notes, req.params.id]
    );
    if (!result.affectedRows) return sendError(res, 'Prescription not found', 404);
    return sendSuccess(res, null, 'Prescription updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getPrescriptionById, createPrescription, updatePrescription };
