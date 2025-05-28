const express = require('express');
const router = express.Router();
const LoginLog = require('../models/LoginLog');
const User = require('../models/User');
const employeeController = require('../controllers/employeeController');

// Employee CRUD routes (Admin only)
router.get('/', employeeController.listEmployees);
router.get('/add', employeeController.renderAddEmployee);
router.post('/add', employeeController.addEmployee);
router.get('/edit/:id', employeeController.renderEditEmployee);
router.post('/edit/:id', employeeController.updateEmployee);
router.post('/delete/:id', employeeController.deleteEmployee);
router.get('/logins/:id', employeeController.getEmployeeLogins);


module.exports = router;
