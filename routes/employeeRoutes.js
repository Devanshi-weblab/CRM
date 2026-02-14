const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { employeeAddEditRules, inviteEmployeeRules, handleValidation, handleInviteValidation } = require('../validators/employeeValidators');
const asyncHandler = require('../middleware/asyncHandler');

router.use(isAuthenticated, isAdmin);

router.get('/', asyncHandler(employeeController.listEmployees));
router.get('/add', employeeController.renderAddEmployee);
router.post('/add', employeeAddEditRules, handleValidation, asyncHandler(employeeController.addEmployee));
router.get('/invite', employeeController.renderInviteEmployee);
router.post('/invite', inviteEmployeeRules, handleInviteValidation, asyncHandler(employeeController.inviteEmployee));
router.get('/edit/:id', asyncHandler(employeeController.renderEditEmployee));
router.post('/edit/:id', employeeAddEditRules, handleValidation, asyncHandler(employeeController.updateEmployee));
router.post('/delete/:id', asyncHandler(employeeController.deleteEmployee));
router.get('/logins/:id', asyncHandler(employeeController.getEmployeeLogins));

module.exports = router;
