const router = require('express').Router();
const {
  getAllRoles, getRoleById, createRole, updateRole, deleteRole
} = require('../controllers/role.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.get('/',      authenticate, getAllRoles);
router.get('/:id',   authenticate, getRoleById);
router.post('/',     authenticate, authorize('Admin'), createRole);
router.put('/:id',   authenticate, authorize('Admin'), updateRole);
router.delete('/:id',authenticate, authorize('Admin'), deleteRole);

module.exports = router;