const jwt  = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Verify JWT token from Authorization header.
 * Attaches decoded user info to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query(
      'SELECT u.user_id, u.role_id, u.full_name, u.email, u.status, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?',
      [decoded.user_id]
    );

    if (!rows.length || rows[0].status !== 'Active') {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Role-based authorization.
 * Usage: authorize('Admin', 'Doctor')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };