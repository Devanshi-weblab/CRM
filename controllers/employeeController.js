const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Default password for employees
const DEFAULT_EMPLOYEE_PASSWORD = 'Admin@123';

// Show all employees in the same company
exports.listEmployees = async (req, res) => {
  try {
    const companyId = req.session.user.companyId;
    const employees = await User.find({ companyId, role: 'employee' });
    res.render('employees/list', { employees});
  } catch (err) {
    res.status(500).send('Error fetching employees: ' + err.message);
  }
};

// Render add employee form
exports.renderAddEmployee = (req, res) => {
  res.render('employees/add');
};

// Handle add employee
exports.addEmployee = async (req, res) => {
  try {
    const { name, email } = req.body;
    const companyId = req.session.user.companyId;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).send('Email already exists');

    const passwordHash = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);

    const newEmployee = new User({
      name,
      email,
      passwordHash,
      role: 'employee',
      companyId
    });

    await newEmployee.save();
    res.redirect('/employees');
  } catch (err) {
    res.status(500).send('Error adding employee: ' + err.message);
  }
};

// Render edit form
exports.renderEditEmployee = async (req, res) => {
  const employee = await User.findById(req.params.id);
  res.render('employees/edit', { employee});
};

// Handle update
exports.updateEmployee = async (req, res) => {
  const { name, email } = req.body;
  await User.findByIdAndUpdate(req.params.id, { name, email });
  res.redirect('/employees');
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/employees');
};
