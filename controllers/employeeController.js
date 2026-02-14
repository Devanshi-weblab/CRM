const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const Invitation = require('../models/Invitation');
const Company = require('../models/Company');
const { sendEmail } = require('../services/email');
const { invitationEmail } = require('../services/email/templates');

// Show all employees in the same company
exports.listEmployees = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    const companyId = user.companyId;
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const sortBy = (req.query.sort === 'name') ? 'name' : 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    const sortObj = sortBy === 'name' ? { name: sortOrder } : { createdAt: -1 };

    // Get total count for pagination
    const totalEmployees = await User.countDocuments({ companyId, role: 'employee' });
    const totalPages = Math.ceil(totalEmployees / limit);

    const employees = await User.find({ companyId, role: 'employee' })
      .skip(skip)
      .limit(limit)
      .sort(sortObj);

    const buildQuery = (overrides = {}) => {
      const params = { ...req.query, ...overrides };
      const s = Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      return s ? '?' + s : '';
    };

    res.render('employees/list', { 
      pageTitle: 'Employees',
      employees,
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      buildQuery,
      pagination: {
        page,
        totalPages,
        totalEmployees,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// Render add employee form (legacy – direct add with default password)
exports.renderAddEmployee = (req, res) => {
  res.render('employees/add', { pageTitle: 'Add New Employee' });
};

// Handle add employee (legacy)
exports.addEmployee = async (req, res) => {
  try {
    const { name, email } = req.body;
    const companyId = req.session.user.companyId;
    const existing = await User.findOne({ email });
    if (existing) {
      req.session.flash = { type: 'error', message: 'Email already exists.' };
      return res.redirect('/employees/add');
    }
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    await User.create({ name, email, passwordHash, role: 'employee', companyId });
    req.session.flash = { type: 'success', message: 'Employee added successfully.' };
    res.redirect('/employees');
  } catch (err) {
    req.session.flash = { type: 'error', message: 'Error adding employee: ' + err.message };
    res.redirect('/employees/add');
  }
};

// Render invite employee form
exports.renderInviteEmployee = (req, res) => {
  res.render('employees/invite', { pageTitle: 'Invite Employee' });
};

// Send invitation email and create Invitation
exports.inviteEmployee = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    const companyId = user.companyId;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.session.flash = { type: 'error', message: 'A user with this email already exists.' };
      return res.redirect('/employees/invite');
    }

    const pendingInvite = await Invitation.findOne({ email, companyId, acceptedAt: null });
    if (pendingInvite && pendingInvite.expiresAt > new Date()) {
      req.session.flash = { type: 'error', message: 'An invitation was already sent to this email.' };
      return res.redirect('/employees/invite');
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const { invitation } = await Invitation.createInvitation({
      email,
      companyId,
      invitedBy: user.id,
      tempPassword
    });

    const company = await Company.findById(companyId).select('name').lean();
    const baseUrl = process.env.APP_URL || (req.protocol + '://' + req.get('host'));
    const acceptUrl = `${baseUrl}/auth/accept-invite/${invitation.token}`;
    const { subject, text, html } = invitationEmail({
      acceptUrl,
      tempPassword,
      companyName: company?.name,
      recipientName: name || undefined
    });

    await sendEmail({ to: email, subject, text, html });
    req.session.flash = { type: 'success', message: `Invitation sent to ${email}. They have 7 days to accept.` };
    res.redirect('/employees');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message || 'Failed to send invitation.' };
    return res.redirect('/employees/invite');
  }
};

// Render edit form
exports.renderEditEmployee = async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/auth/login');
  const employee = await User.findOne({
    _id: req.params.id,
    companyId: user.companyId,
    role: 'employee'
  });
  if (!employee) return res.status(404).send('Employee not found');
  res.render('employees/edit', { pageTitle: 'Edit Employee', employee });
};

// Handle update
exports.updateEmployee = async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/auth/login');
  const employee = await User.findOne({
    _id: req.params.id,
    companyId: user.companyId,
    role: 'employee'
  });
  if (!employee) return res.status(404).send('Employee not found');
  await User.findByIdAndUpdate(req.params.id, { name: req.body.name, email: req.body.email });
  req.session.flash = { type: 'success', message: 'Employee updated successfully.' };
  res.redirect('/employees');
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/auth/login');
  const employee = await User.findOne({
    _id: req.params.id,
    companyId: user.companyId,
    role: 'employee'
  });
  if (!employee) return res.status(404).send('Employee not found');
  await User.findByIdAndDelete(req.params.id);
  req.session.flash = { type: 'success', message: 'Employee deleted.' };
  res.redirect('/employees');
};

// Get employee login logs
exports.getEmployeeLogins = async (req, res, next) => {
  const user = req.session.user;
  if (!user) return res.redirect('/auth/login');
  const userId = req.params.id;
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  try {
    const employee = await User.findOne({
      _id: userId,
      companyId: user.companyId,
      role: 'employee'
    });
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
      pageTitle: `Login Logs - ${employee.name}`,
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
    next(err);
  }
};
