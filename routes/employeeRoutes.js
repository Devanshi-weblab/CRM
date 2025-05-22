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


// Show login logs for an employee (last 30 days)
router.get('/logins/:id', async (req, res) => {
  const userId = req.params.id;
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  try {
    const logs = await LoginLog.find({
      userId,
      loginTime: { $gte: oneMonthAgo }
    }).sort({ loginTime: -1 });

    const employee = await User.findById(userId);

    res.render('employees/employeeLogins', { employee, logs });
  } catch (err) {
    res.status(500).send('Failed to fetch login logs');
  }
});

module.exports = router;
