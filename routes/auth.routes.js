const router = require('express').Router();
const { login, register, getProfile, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/register',        register);           // public
router.post('/login',           login);              // public
router.get('/profile',          authenticate, getProfile);
router.put('/change-password',  authenticate, changePassword);

module.exports = router;
