const router = require('express').Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.get('/',       authorize('Admin'), getAllUsers);
router.get('/:id',    authorize('Admin'), getUserById);
router.post('/',      authorize('Admin'), createUser);
router.put('/:id',    authorize('Admin'), updateUser);
router.delete('/:id', authorize('Admin'), deleteUser);

module.exports = router;