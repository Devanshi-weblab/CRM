const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');

// Default password for employees
const DEFAULT_EMPLOYEE_PASSWORD = 'Admin@123';

// Show all employees in the same company
exports.listEmployees = async (req, res) => {
  try {
    const companyId = req.session.user.companyId;
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalEmployees = await User.countDocuments({ companyId, role: 'employee' });
    const totalPages = Math.ceil(totalEmployees / limit);

    const employees = await User.find({ companyId, role: 'employee' })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    res.render('employees/list', { 
      employees,
      pagination: {
        page,
        totalPages,
        totalEmployees,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
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

// Get employee login logs
exports.getEmployeeLogins = async (req, res) => {
  const userId = req.params.id;
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  
  try {
    const employee = await User.findById(userId);
    if (!employee) {
      return res.status(404).send('Employee not found');
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalLogs = await LoginLog.countDocuments({ userId: employee._id });
    const totalPages = Math.ceil(totalLogs / limit);

    // Get logs with all location fields
    const logs = await LoginLog.find({ 
      userId: employee._id, 
      loginTime: { $gte: oneMonthAgo } 
    })
    .select('loginTime ipAddress latitude longitude fullAddress city country postalCode userAgent')
    .skip(skip)
    .limit(limit)
    .sort({ loginTime: -1 }); // Sort by newest first

    res.render('employees/employeeLogins', {
      employee,
      logs,
      pagination: {
        page,
        totalPages,
        totalLogs,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('Error fetching login logs:', err);
    res.status(500).send('Error fetching login logs: ' + err.message);
  }
};
